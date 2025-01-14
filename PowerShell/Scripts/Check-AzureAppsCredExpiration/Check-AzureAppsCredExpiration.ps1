<# 
.SYNOPSIS
    Checks and reports the expiration status of Azure Application credentials and sends email alerts for expired or expiring 
    credentials.

.DESCRIPTION
    This PowerShell script checks the expiration status of credentials for Azure Applications and sends email alerts if any 
    of the credentials are expired or set to expire soon. It leverages the Microsoft Graph API for Azure Application data 
    retrieval and email notifications.

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
    - LimitExpirationDays : This parameter is set to "90" and indicates the number of days before expiration for sending an e-mail alert.

.OUTPUTS
    This script generates logging information and may send email alerts for expired or expiring Azure Application credentials.

.EXAMPLE
    PS> .\Check-AzureAppsCredExpiration.ps1 -VerboseLvl 0

.EXAMPLE
    PS> .\Check-AzureAppsCredExpiration.ps1 -VerboseLvl 2

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-AzureAppsCredExpiration/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-AzureAppsCredExpiration/Check-AzureAppsCredExpiration.ps1

.NOTES
    Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.
    Ensure that the App Registration is granted the following permissions:
        - Microsoft Graph -> Mail.send
        - Microsoft Graph -> Application.Read.All

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

                [string]$LimitExpirationDays = $Script_Param.LimitExpirationDays
                [string[]]$exceptionList     = $Script_Param.ApplicationToExclude
                
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

                $GraphModulesList = "Authentication","Applications","Users.Actions"
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

        try{       
            $Apps = Get-MgApplication -All -PageSize 500 -ErrorAction Stop
        }
        catch{
            Log "Script" "Unable to retrieve application" 1 Red
                $errMailAD += "ERROR DETECTED - Unable to retrieve application. <br> $($_.Exception.Message)"
                Get-DebugError $_
        }
    
    
        $today = Get-Date
        $credentials = @()
    
        
        foreach ($ap in $Apps) 
        {
            if ($exceptionList.Contains($ap.DisplayName)) { 
                continue 
            }
            
            try{       
                $aadAppObjId = $ap.Id
                $nameApp = $ap.DisplayName
                $app = Get-MgApplication -ApplicationId $aadAppObjId -ErrorAction Stop
                $owner = Get-MgApplicationOwner -ApplicationId $aadAppObjId -ErrorAction Stop
            }
            catch{
                Log "Script" "Unable to retrieve information from [$nameApp] application" 1 Red
                $errMailAD += "ERROR DETECTED - Unable to retrieve information from [$nameApp] application. <br> $($_.Exception.Message)"
                Get-DebugError $_
                continue
            }
    
    
            $app.KeyCredentials | ForEach-Object{
                $credentials += [PSCustomObject] @{
                    DisplayName = $app.DisplayName;
                    CredentialType = "Certificate";
                    StartDate = $_.StartDateTime;
                    ExpiryDate = $_.EndDateTime;
                    Expired = if(([DateTime]$_.EndDateTime) -lt $today) { "Yes" }else{"No"};
                    ExpireSoon = if(([DateTime]$_.EndDateTime) -lt (Get-Date).AddDays($LimitExpirationDays)) { "Yes" }else{"No"};
                    ExpireIn = "$([int]$(([DateTime]$_.EndDateTime) - (Get-Date)).TotalDays) days";
                    Type = $_.Type;
                    Usage = $_.Usage;
                    Owners = $owner.AdditionalProperties.userPrincipalName;
                    }
            }
    
            $app.PasswordCredentials | ForEach-Object{
                $credentials += [PSCustomObject] @{
                    DisplayName = $app.DisplayName;
                    CredentialType = "Client Secret";                
                    StartDate = $_.StartDateTime;
                    ExpiryDate = $_.EndDateTime;
                    Expired = if(([DateTime]$_.EndDateTime) -lt $today) { "Yes" }else{"No"};
                    ExpireSoon = if(([DateTime]$_.EndDateTime) -lt (Get-Date).AddDays($LimitExpirationDays)) { "Yes" }else{"No"};
                    ExpireIn = "$([int]$(([DateTime]$_.EndDateTime) - (Get-Date)).TotalDays) days";
                    Type = 'NA';
                    Usage = 'NA';
                    Owners = $owner.AdditionalProperties.userPrincipalName;
                }
            }
        }
        $credentialsExpired = $credentials | Where-Object {$_.Expired -eq "Yes"} 
        $credentialsExpireSoon = $credentials | Where-Object {$_.Expired -eq "No" -and $_.ExpireSoon -eq "Yes"}


        $bodyExpired = ""
        $bodyExpireSoon = ""
        if(-not[string]::IsNullOrEmpty($credentialsExpired)) 
        {
            $bodyExpired += ($credentialsExpired | Select-Object DisplayName,CredentialType,StartDate,ExpiryDate,ExpireIn,Usage,Owners | ConvertTo-Html -Fragment -As Table) -replace "<table>","<table id='ExpireTable'>"
        }else{
            $bodyExpired += "<strong>Aucun</strong>"
        }

        if(-not [string]::IsNullOrEmpty($credentialsExpireSoon)) 
        {
            $bodyExpireSoon += ($credentialsExpireSoon | Select-Object DisplayName,CredentialType,StartDate,ExpiryDate,ExpireIn,Usage,Owners | ConvertTo-Html -Fragment -As Table) -replace "<table>","<table id='ExpireTable'>"
        }else{
            $bodyExpireSoon += "<strong>Aucun</strong>"
        }

        if ((-not [string]::IsNullOrEmpty($credentialsExpired)) -or (-not [string]::IsNullOrEmpty($credentialsExpireSoon)) -or (-not [string]::IsNullOrEmpty($errMailAD)) )
        {
            if (-not [string]::IsNullOrEmpty($errMailAD)){$errMailAD += "See error log for more information"}

            [string]$ObjectMessage = "AZURE APP - Azure App Credential expire soon !"
            [string]$BodyMessage = $mailTemplate -replace "!--TABLE_EXPIRED--!" , $bodyExpired `
                                                 -replace "!--TABLE_EXPIRESOON--!", $bodyExpireSoon `
                                                 -replace "!--ERROR_MAIL--!", $errMailAD
                                                 
            Log "Script" "Expired or expiring credentials have been found..."  1 Red
            try
            {
                if (-not [string]::IsNullOrEmpty($errMailAD))
                {
                    $errMailAD += "See error log for more information"
                    $ErrorLogFile = Get-ChildItem "$global:Path_Logs\Error" -Recurse | Where-Object {$_.Name -like "*$($global:Date_Logs_File)*" | Select-Object -First 1} 
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage -Attachments $ErrorLogFile.FullName
                    Log "Script" "Mail sent - Application Expire soon and script error" 2 Yellow
                }
                else
                {
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage
                    Log "Script" "Mail sent - Application Expire soon" 2 Yellow
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
            Log "Script" "Mail not sent - None Application Expire soon" 2 Green
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







