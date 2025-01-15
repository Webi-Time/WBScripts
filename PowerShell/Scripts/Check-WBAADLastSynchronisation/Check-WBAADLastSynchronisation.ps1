<# 
.SYNOPSIS
    Checks Azure AD synchronization status, sends alerts if synchronization is broken or interrupted.

.DESCRIPTION
    This script checks the Azure Active Directory (Azure AD) synchronization status by comparing the last sync time with a specified threshold. 
    If the sync is found to be out of date, an alert email is sent. The script also logs relevant information and errors to specific log files. 
    It uses Microsoft Graph API and handles module loading, certificate validation, and email notifications in case of errors.

.PARAMETER VerboseLvl
    Defines the level of verbosity in the script's output.
        - 0: No output to console.
        - 1: Displays errors only.
        - 2: Displays basic information and errors.
        - 3: Displays standard messages, basic information, and errors.
        - 4: Displays detailed messages, standard information, and errors.
        - 5: Displays debug information, detailed messages, standard information, and errors.

.INPUTS
    - JSON File with tenant information
.INPUTS
    - MaxMinutes : This parameter is set to "45" and indicates the maximum number of minutes without synchronization and e-mail alert.

.EXAMPLE
    PS> .\Check-WBAADLastSynchronisation.ps1 

.EXAMPLE
    PS> .\Check-WBAADLastSynchronisation.ps1 -VerboseLvl 0

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-WBAADLastSynchronisation/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-WBAADLastSynchronisation/Check-WBAADLastSynchronisation.ps1

.NOTES
    Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.
    
    Ensure that the App Registration is granted the following permissions:
        - Microsoft Graph -> Mail.send
        - Microsoft Graph -> Organization.Read.All

    Author: Damien Aubril

    >License: Not applicable

    >Date: October 26, 2023
    
    Version: 1.0
    
    Change Log :
        - Update - 05/09/2024
        - Update - 15/01/2025
#>

[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 2
)
Begin 
{
    try
    {
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
                [string]$Path_Result = if([string]::IsNullOrEmpty($ResultPath)){$Path_Root + "\Results\"}else{$ResultPath}

            # Get the date in "yyyy-MM-dd-HH-mm-ss" format for log files
                [string]$global:Date_Logs_File = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
                $global:VerboseLvl             = $VerboseLvl
        #endregion 

        #region Modules
            [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name | Where-Object {$_ -notlike "*beta*"}
            try
            {
                Import-Module -Name ModuleGenerics -Force -ErrorAction Stop
            }
            catch 
            {                
                Write-host "You must place the [ModuleGenerics] in one of the following appropriate folders before running the scripts : `n`r`t - $($env:USERPROFILE)\Documents\WindowsPowerShell\Modules`n`r`t - C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules" -f Red
                Write-host $_.Exception.Message
                exit -1
            }            
            try
            {
                Test-PackageProvider "NuGet"   

                $GraphModulesList = "Authentication","Identity.DirectoryManagement","Users","Users.Actions"
                $OthersModulesList =  $null
                if(-not (Test-Modules ($GraphModulesList + $OthersModulesList)))
                {
                    
                    if ($PSVersionTable.PSVersion -like "7.*")
                    {
                        $GraphModulesVrs = $null
                    }
                    else
                    {
                        $GraphModulesVrs = $null 
                    } 
                    Install-GraphModuleInduviduals $GraphModulesList -DesiredVersion $GraphModulesVrs 
                    Import-GraphModuleInduviduals $GraphModulesList -DesiredVersion $GraphModulesVrs
                }
            }
            catch 
            {
                Get-DebugError $_
                exit 1
            }

        #endregion

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

            # Get configuration values for Script Variable
                [string]$HTMLTemplatePath  = $Script_Param.TemplateHTMLPath

                [string]$clientId        = $Tenant_Param.clientId
                [string]$tenantId        = $Tenant_Param.tenantId
                [string]$CertThumbprint  = $Tenant_Param.clientCertificate

                [string]$FromMail       = $Script_Param.Mail.FromMail
                [string]$ToMail         = $Script_Param.Mail.ToMail

                [string]$mailTemplatePath = $Script_Param.Mail.TemplatePath
                [string]$errMailAD        = $null

                [string]$MaxMinutes = $Script_Param.MaxMinutes
                    
        #endregion
        
        #region Variables Global

        #endregion

        #region Script Functions

        #endregion

        #region Initialisation
            if(-not (Test-CertThumbprint $CertThumbprint -My))
            {
                throw "No matching certificates with Thumbprint: $CertThumbprint, verify JSON File or import the certificate"
            }

            Show-Param -LesParam $PSBoundParameters
            # Calculate the space used by log and result folders and check if it's within the specified limit
            $SpaceUsed = Test-SpaceFolders ($global:Path_Logs,$Path_Result) $FilesToKeep $SpaceMax
            Log "Script" "$ScriptName - Use $SpaceUsed of $(WSize $SpaceMax) limit" 2 Cyan
        #endregion 
    }
    catch 
    {
        Get-DebugError $_ 
        exit -1
    }
}
Process 
{
    try 
    {
        Log "Script" "Start of script : $($MyInvocation.MyCommand.Name)" 99 Cyan  
        
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
 

       
#region Sending an email if users have just been disabled
        # Currently without email sending, please refer to the documentation on how to add email sending
        if(($LastDirSyncTime -le $MaxDeltaSync) -or (-not [string]::IsNullOrEmpty($errMailAD)))
        {
            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
            }

            $TEXT_TITRE = "AZURE AD CONNECT - SYNC IS BROKEN"
            $TEXT_INTRO  = "AD Connect has not been synchronized for more than <strong>$MaxMinutes</strong> minutes"
            $TABLE_HTML  = "The last synchronization was performed on: <b>$RealDate</b> ($(WDate -dateW $Difference -typeInput Hour))"
            $TEXT_ACTION = $errMailAD
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_AzureSyncBroken.html" -Encoding utf8 -Force
        
            Log "Script" "File generate - Problem on Azure AD synchronization. `r`n`t [$Path_Result\$($Date_Logs_File)_AzureSyncBroken.html]" 1 Yellow      
            <#
                # Envoie de mail avec API Graph
                try
                {
                    if (-not [string]::IsNullOrEmpty($errMailAD))
                    {
                        $ErrorLogFile = Get-ChildItem "$global:Path_Logs\Error" -Recurse | Where-Object {$_.Name -like "*$($global:Date_Logs_File)*" | Select-Object -First 1} 
                    }else{
                        $ErrorLogFile = $null
                    }
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $bodyAdmin -Attachments $ErrorLogFile.FullName
                    Log "Script" "Mail sent" 2 Yellow                
                } 
                catch 
                { 
                    Log "Script" "Error - Unable to send mail" 1 Red
                    Get-DebugError $_
                    Disconnect-MsGraphTenant
                    exit -1
                }
            #>
        }
        else
        {
            Log "Script" "The synchronization was performed at $RealDate" 1 Green 
            Log "Script" "Mail not sent - Synchronization OK" 2 Green
        }
        #endregion
        Disconnect-MsGraphTenant
    }
    catch {
        Get-DebugError $_
        exit 1
    }
}
End 
{
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
}

