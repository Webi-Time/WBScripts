<# 
.SYNOPSIS
    Checks Azure AD synchronization status, sends alerts if synchronization is broken or interrupted.

.DESCRIPTION
    This script checks the Azure Active Directory (Azure AD) synchronization status by comparing the last sync time with a specified threshold. 
    If the sync is found to be out of date, an alert email is sent. The script also logs relevant information and errors to specific log files. 
    It uses Microsoft Graph API and handles module loading, certificate validation, and email notifications in case of errors.

.PARAMETER VerboseLvl
    Specifies the level of verbosity for logging. Logs are always written to a file, but console output varies:
    - `0`: No console output (silent mode). All output is logged to the file.
    - `1`: Minimal logging. Root level information and errors are displayed.
    - `2`: Basic logging. Displays basic information and errors. (DEFAULT)
    - `3`: Standard logging. Displays standard log messages, basic information, and errors.
    - `4`: Verbose logging. Displays detailed log messages, standard information, and errors.
    - `5`: Ultra verbose logging. Displays debug information, detailed log messages, standard information, and errors.

.PARAMETER AllowBeta
    If set to $true, the script will allow the installation of beta versions of Microsoft Graph modules. By default, it is set to $false.

.INPUTS
    - JSON File with tenant information
.INPUTS
    - MaxMinutes : This parameter is set to "45" and indicates the maximum number of minutes without synchronization and e-mail alert.

.EXAMPLE
    PS> .\Check-AADLastSynchronisation.ps1 

.EXAMPLE
    PS> .\Check-AADLastSynchronisation.ps1 -VerboseLvl 0

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-AADLastSynchronisation/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-AADLastSynchronisation/Check-AADLastSynchronisation.ps1

.NOTES
    Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.
    
    Ensure that the App Registration is granted the following permissions:
        - Microsoft Graph -> Mail.send
        - Microsoft Graph -> Organization.Read.All

    Author = 'AUBRIL Damien'
    Creation Date : 26/10/2023
    Version : 2.0
    Version Date : 05/09/2024
#>

[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false)][ValidateSet(0, 1, 2, 3, 4, 5)]
    [byte]$VerboseLvl = 2,

    [Parameter(mandatory=$false)]
    [switch]$AllowBeta = $false
)
   
Begin 
{
#region Begin
    try{
        Clear-Host
        $StartScript = Get-Date
        if($VerboseLvl -ne 0){Write-host "$(Get-Date -f 'dd/MM/yyyy HH:mm:ss') - Script start : " -f Cyan -NoNewline; Write-host "[$($MyInvocation.MyCommand.Name)]" -f Red}
        $ErrorActionPreference = 'Stop'

        #region Script Variables

            # Get the script name without the .ps1 extension
                [string]$ScriptName = ($($MyInvocation.MyCommand.Name) -split ".ps1")[0]

            # Set the root path of the script
                [string]$Path_Root = $PSScriptRoot

            # Create the path for script log files
                [string]$global:Path_Logs = $Path_Root + "\Logs\"

            # Create the path for script result files
                [string]$Path_Result = $null # $Path_Root + "\Results\"

            # Get the date in "yyyy-MM-dd-HH-mm-ss" format for log files
                [string]$global:Date_Logs_File = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
                        $global:VerboseLvl = $VerboseLvl
        #endregion Script Variables

        #region JSON Config

            # Path to JSON configuration files
                [string]$File_Config = $Path_Root + "\*.json"

            # Load JSON configuration from the file
                [PSCustomObject]$Params = Get-Content $File_Config -Raw | ConvertFrom-Json
                
                [PSCustomObject]$Generic_Param = $Params.Generic
                [PSCustomObject]$Tenant_Param  = $Params.Tenant
                [PSCustomObject]$Script_Param  = $Params.Script

            # Get configuration values for files to keep and maximum space
                [int]$FilesToKeep = $Generic_Param.FilesToKeep
                [long]$SpaceMax   = Invoke-Expression $($Generic_Param.SpaceToUseByScriptsMax)

                [string]$clientId       = $Tenant_Param.clientId
                [string]$tenantId       = $Tenant_Param.tenantId
                [string]$CertThumbprint = $Tenant_Param.clientCertificate

            # Variables du script
                [string]$FromMail = $Script_Param.Mail.FromMail
                [string]$ToMail   = $Script_Param.Mail.ToMail

                [string]$mailTemplatePath = $Script_Param.Mail.TemplatePath
                [string]$errMailAD        = $null

                [string]$MaxMinutes = $Script_Param.MaxMinutes
        #endregion JSON Config

        #region Modules
            Write-Output "Loading Modules"
            try
            {
                Import-Module -Name ModuleGenerics -Force -ErrorAction Stop
            }
            catch 
            {
                Write-host "You must place the [ModuleGenerics] in one of the following appropriate folders before running the scripts : `n`r`t - $($env:USERPROFILE)\Documents\WindowsPowerShell\Modules`n`r`t - C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules" -f Red
                Write-host "More information at the begin of psm1 file" -ForegroundColor Yellow
                exit 1
            } 
            try
            {  
                Test-PackageProvider "NuGet" 
                #Test-PackageProvider "PowerShellGet"    

                $GraphModulesList = "Authentication","Identity.DirectoryManagement","Users","Users.Actions"
                #$OthersModulesList = "ExchangeOnlineManagement","MSOnline"
                if(-not (Test-Modules ($GraphModulesList + $OthersModulesList)))
                {
                    if($AllowBeta){
                        [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name
                    }else{
                        [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name | Where-Object {$_ -notlike "*beta*"}
                    }
                    $GraphModulesVrs = $null 
                    Install-GraphModuleInduviduals $GraphModulesList -DesiredVersion $GraphModulesVrs 
                    Import-GraphModuleInduviduals  $GraphModulesList -DesiredVersion $GraphModulesVrs 

                }
                if(-not (Test-CertThumbprint $CertThumbprint -My)){
                    throw "No matching certificates with Thumbprint: $CertThumbprint, verify JSON File or import the certificate"
                }

            }
            catch 
            {
                Get-DebugError $_
                exit 1
            }

        #endregion Modules

        #region function
           # N.A
        #endregion function

        #region Script Prerequisites

            try {
                if ($mailTemplatepath -contains ":") {
                    [string]$mailTemplate = Get-Content "$mailTemplatepath" -Raw
                }else{
                    [string]$mailTemplate = Get-Content "$Path_Root\$mailTemplatepath" -Raw
                }
            }
            catch {
                Get-DebugError $_
            }

            Show-Param -LesParam $PSBoundParameters

            # Calculate the space used by log and result folders and check if it is within the specified limit
            $SpaceUsed = Test-SpaceFolders ($global:Path_Logs,$Path_Result) $FilesToKeep $SpaceMax
            Log "Script" "$ScriptName - use $SpaceUsed of $(WSize $SpaceMax) limit" 2 Cyan

        #endregion Prerequisites
        
    }
    catch 
    {
        Get-DebugError $_ 
        exit 1
    }

#endregion Begin
}
Process 
{
#region Process
    try 
    {
        Disconnect-MsGraphTenant -Type Silently | Out-Null
        Connect-MsGraphTenant -ClientId $clientId -TenantId $tenantId -CertThumbprint $CertThumbprint
        try{
            [DateTime]$MaxDeltaSync = ((Get-Date).ToUniversalTime())-(New-TimeSpan -Hours 0 -Minutes $MaxMinutes)
            $OrganisationInfo =(Get-MgOrganization -ErrorAction Stop)
            if ([string]::IsNullOrEmpty($OrganisationInfo.OnPremisesLastSyncDateTime)) {
                $RealDate = "Never"
                Log "Script" "Unable to retrieve information on the last synchronization because it has never happened." 1 Yellow
            }else{
                [DateTime]$LastDirSyncTime = $OrganisationInfo.OnPremisesLastSyncDateTime
                $RealDate = [System.TimeZoneInfo]::ConvertTimeFromUtc($LastDirSyncTime, (Get-TimeZone))
                [int]$Difference = ($(Get-Date) - $RealDate).TotalHours   
            }
        }
        catch
        {
            Log "Script" "Error - Unable to retrieve information on last synchronization" 1 Red
            Get-DebugError $_   

            $errMailAD = "ERROR DETECTED - Unable to retrieve information on last synchronization. Check Log. <br> $($_.Exception.Message)"
            [DateTime]$LastDirSyncTime = [datetime]::new(1)
        }
 

        if(($LastDirSyncTime -le $MaxDeltaSync) -or (-not [string]::IsNullOrEmpty($errMailAD)))
        {
            [string]$ObjectMessage = "AZURE AD CONNECT - SYNC IS BROKEN!"
            [string]$BodyMessage = $mailTemplate -replace "!--MAX_ALERT--!" , $MaxMinutes `
                                                    -replace "!--REAL_DATE--!", $RealDate `
                                                    -replace "!--DELTA_DATE--!", $(WDate -dateW $Difference -typeInput Hour) `
                                                    -replace "!--ERROR_MAIL--!", $errMailAD
        
            Log "Script" "Synchronization has not been performed since $RealDate ($(WDate -dateW $Difference -typeInput Hour))"  1 Red
            try
            {
                if (-not [string]::IsNullOrEmpty($errMailAD))
                {
                    $ErrorLogFile = Get-ChildItem "$global:Path_Logs\Error" -Recurse | Where-Object {$_.Name -like "*$($global:Date_Logs_File)*" | Select-Object -First 1} 
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage -Attachments $ErrorLogFile.FullName
                    Log "Script" "Mail sent - Synchronization Warning and script error" 2 Yellow
                }
                else
                {
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage
                    Log "Script" "Mail sent - Synchronization Warning" 2 Yellow
                }
            } 
            catch 
            { 
                Log "Script" "Error - Unable to send mail" 1 Red
                Get-DebugError $_
                Disconnect-MsGraphTenant
                exit 1
            }
        }
        else
        {
            Log "Script" "The synchronization was performed at $RealDate" 1 Green 
            Log "Script" "Mail not sent - Synchronization OK" 2 Green
        }
    
        Disconnect-MsGraphTenant
    }
    catch {
        Get-DebugError $_
        exit 1
    }
#endregion Process
}
End 
{
#region End
    try
    {
        $Temps = ((Get-Date )-(Get-Date $StartScript)).ToString().Split('.')[0]
        Log "Script" "Running time : " 1 Cyan -NoNewLine ;  Log "Script" "[$($Temps.Split(':')[0])h$($Temps.Split(':')[1])m$($Temps.Split(':')[2])s]" 1 Red -NoDate
        Log "Script" "Script end : " 1 Cyan -NoNewLine ;  Log "Script" "[$($MyInvocation.MyCommand.Name)]" 1 Red -NoDate
        exit 0
    }
    catch 
    {
        Get-DebugError $_
        exit 1
    }
#endregion End 
}

