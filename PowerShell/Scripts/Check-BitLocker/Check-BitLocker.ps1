<# 
.SYNOPSIS
    Checks BitLocker status for computers in Active Directory and sends an email alert for missing recovery keys.

.DESCRIPTION
    This script queries Active Directory for computer objects, checks their BitLocker recovery keys, and sends an email 
    alert if any computers are missing recovery keys. It uses the Microsoft Graph API to send email notifications.

.PARAMETER VerboseLvl
    Defines the level of verbosity in the script's output.
        - 0: No output to console.
        - 1: Displays errors only.
        - 2: Displays basic information and errors.
        - 3: Displays standard messages, basic information, and errors.
        - 4: Displays detailed messages, standard information, and errors.
        - 5: Displays debug information, detailed messages, standard information, and errors.

.PARAMETER AllowBeta
    If set to $true, the script will allow the installation of beta versions of Microsoft Graph modules. By default, it is set to $false.

.INPUTS
    - JSON File with tenant information
    - MaxMinutes : This parameter is set to "45" and indicates the maximum number of minutes without synchronization and e-mail alert.

.EXAMPLE
    PS> .\Check-BitLocker.ps1

.EXAMPLE
    PS> .\Check-BitLocker.ps1 -VerboseLvl 2

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-BitLocker/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-BitLocker/Check-BitLocker.ps1

.NOTES
    Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.
    Ensure that the App Registration is granted the following permissions:
        - Microsoft Graph -> Mail.send

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
                [string]$Path_Result = if([string]::IsNullOrEmpty($ResultPath)){$Path_Root + "\Results\"}else{$ResultPath}

            # Get the date in "yyyy-MM-dd-HH-mm-ss" format for log files
                [string]$global:Date_Logs_File = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
                $global:VerboseLvl             = $VerboseLvl
        #endregion Script Variables

        #region JSON Config

            # Path to JSON configuration files
                [string]$File_Config = $Path_Root + "\*.json"

            # Load JSON configuration from the file
                [PSCustomObject]$Params = Get-Content $File_Config -Raw | ConvertFrom-Json
                
                [PSCustomObject]$Generic_Param = $Params.Generic
                [PSCustomObject]$Tenant_Param =  $Params.Tenant
                [PSCustomObject]$Script_Param =  $Params.Script

            # Get configuration values for files to keep and maximum space
                [int]$FilesToKeep = $Generic_Param.FilesToKeep
                [long]$SpaceMax = Invoke-Expression $($Generic_Param.SpaceToUseByScriptsMax)

                [string]$clientId        = $Tenant_Param.clientId
                [string]$tenantId        = $Tenant_Param.tenantId
                [string]$CertThumbprint  = $Tenant_Param.clientCertificate

            # Variables du script
                [string]$FromMail       = $Script_Param.Mail.FromMail
                [string]$ToMail         = $Script_Param.Mail.ToMail

                [string]$mailTemplatePath = $Script_Param.Mail.TemplatePath
                [string]$errMailAD = $null

                [string]$base = $Script_Param.OUBase
                [string[]]$exceptionList = $Script_Param.ComputerToExclude
                
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
                Import-Module -Name ActiveDirectory -Force -ErrorAction Stop

                Test-PackageProvider "NuGet" 
                #Test-PackageProvider "PowerShellGet"    

                $GraphModulesList = "Authentication","Users.Actions"
                #$OthersModulesList = "ExchangeOnlineManagement","MSOnline"
                if(-not (Test-Modules ($GraphModulesList + $OthersModulesList)))
                {
                    if($AllowBeta){
                        [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name
                    }else{
                        [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name | Where-Object {$_ -notlike "*beta*"}
                    }
                    $vrs = $null 
                    Install-GraphModuleInduviduals $GraphModulesList -DesiredVersion $vrs 
                    Import-GraphModuleInduviduals $GraphModulesList -DesiredVersion $vrs
                }
                if(-not (Test-CertThumbprint $CertThumbprint -My))
                {
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
                    [string]$mailTemplate       = Get-Content "$mailTemplatepath" -Raw
                }else{
                    [string]$mailTemplate       = Get-Content "$Path_Root\$mailTemplatepath" -Raw
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

        try
        {
            Log "Script" "Retrieving the computer list" 1 Cyan
            $list_computers = Get-ADComputer -Filter {(Enabled -eq $True)} -SearchBase $base -Server $Domain -SearchScope Subtree -Property msTPM-OwnerInformation, msTPM-TpmInformationForComputer, PasswordLastSet
        }
        catch
        {
            Log "Script" "Error - Unable to retrieve computer list from OnPremise AD" 1 Red
            Get-DebugError $_   
            $errMailAD = "ERROR DETECTED - Unable to retrieve computer list from OnPremise AD <br> $($_.Exception.Message)"
        }

  
        $ComputerWithoutRKey = @()
        foreach ($computer in $list_computers) {

            if (($computer.DistinguishedName -match "DESKTOP") -or $exceptionList.Contains($computer.name)) { 
                continue 
            }

            [string]$BitLocker_Key = ""
                
            #Check if the computer object has had a BitLocker Recovery Password
            $Bitlocker_Object = Get-ADObject -Filter {objectclass -eq 'msFVE-RecoveryInformation'} -SearchBase $computer.DistinguishedName -Properties 'msFVE-RecoveryPassword' -Server $Domain | Select-Object -Last 1

            if(-not [string]::IsNullOrEmpty($Bitlocker_Object.'msFVE-RecoveryPassword')) 
            {
                $BitLocker_Key = $BitLocker_Object.'msFVE-RecoveryPassword'
            }
            else 
            {
                $ComputerWithoutRKey += [PSCustomObject] @{
                    DisplayName = $computer.name;    
                    PasswordLastSet = $computer.PasswordLastSet;
                }
                
            }
        }


        if ((-not [string]::IsNullOrEmpty($ComputerWithoutRKey)) -or (-not [string]::IsNullOrEmpty($errMailAD)))
        {
            
            $tablehtml = $($ComputerWithoutRKey | Select-Object * | ConvertTo-Html -Fragment -As Table) -replace "<table>","<table id='BitlockerTable'>"

            [string]$ObjectMessage = "ONPREM - Cannot found Bitlocker recovery key for computers"
            [string]$BodyMessage = $mailTemplate -replace "!--TABLE_BITLOCKER--!" , $tablehtml `
                                                 -replace "!--ERROR_MAIL--!", $errMailAD
        
            Log "Script" "Computer without Bitlocker foud"  1 Yellow
            try
            {
                if (-not [string]::IsNullOrEmpty($errMailAD))
                {
                    $ErrorLogFile = Get-ChildItem "$global:Path_Logs\Error" -Recurse | Where-Object {$_.Name -like "*$($global:Date_Logs_File)*" | Select-Object -First 1} 
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage -Attachments $ErrorLogFile.FullName
                    Log "Script" "Mail sent - Computer without Bitlocker foud and script error" 2 Yellow
                }
                else
                {
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage
                    Log "Script" "Mail sent - Computer without Bitlocker foud" 2 Yellow
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
            Log "Script" "Mail not sent - No computer without bitlocker" 2 Green
        }
    
        Disconnect-MsGraphTenant
    }
    catch {
        Get-DebugError $_
        Disconnect-MsGraphTenant
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
