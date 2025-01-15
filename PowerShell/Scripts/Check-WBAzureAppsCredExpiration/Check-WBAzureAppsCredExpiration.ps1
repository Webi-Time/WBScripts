<# 
.SYNOPSIS
    Checks and reports the expiration status of Azure Application credentials and sends email alerts for expired or expiring 
    credentials.

.DESCRIPTION
    This PowerShell script checks the expiration status of credentials for Azure Applications and sends email alerts if any 
    of the credentials are expired or set to expire soon. It leverages the Microsoft Graph API for Azure Application data 
    retrieval and email notifications.

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
    - LimitExpirationDays : This parameter is set to "90" and indicates the number of days before expiration for sending an e-mail alert.

.OUTPUTS
    This script generates logging information and may send email alerts for expired or expiring Azure Application credentials.

.EXAMPLE
    PS> .\Check-WBAzureAppsCredExpiration.ps1 -VerboseLvl 0

.EXAMPLE
    PS> .\Check-WBAzureAppsCredExpiration.ps1 -VerboseLvl 2

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-WBAzureAppsCredExpiration/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-WBAzureAppsCredExpiration/Check-WBAzureAppsCredExpiration.ps1

.NOTES
    Additional Notes:
    Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.
     
    Ensure you have the necessary permissions to access Azure AD data.
    
    Ensure that the App Registration is granted the following permissions:
        - Microsoft Graph -> Mail.send
        - Microsoft Graph -> Application.Read.All

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

                $GraphModulesList = "Authentication","Applications","Users.Actions"
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

                [string]$errMailAD = $null

                [string]$LimitExpirationDays = $Script_Param.LimitExpirationDays
                [string[]]$exceptionList     = $Script_Param.ApplicationToExclude
                
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

        try
        {       
            $Apps = Get-MgApplication -All -PageSize 500 -ErrorAction Stop
        }
        catch
        {
            Log "Script" "Unable to retrieve application" 1 Red
            Get-DebugError $_
            $errMailAD += "ERROR DETECTED - Unable to retrieve application. <br> $($_.Exception.Message)"
                
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


       
        #region Sending an email if users have just been disabled
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ((-not [string]::IsNullOrEmpty($credentialsExpired)) -or (-not [string]::IsNullOrEmpty($credentialsExpireSoon)) -or (-not [string]::IsNullOrEmpty($errMailAD)) )
       {
            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
            }
            $bodyExpired = ""
            $bodyExpireSoon = ""
            if(-not[string]::IsNullOrEmpty($credentialsExpired)) 
            {
                $bodyExpired += ($credentialsExpired | Select-Object DisplayName,CredentialType,StartDate,ExpiryDate,ExpireIn,Usage,Owners | ConvertTo-Html -Fragment -As Table -PreContent "<h3>Expired</h3>") -replace "<table>","<table class='RepportUser'>"
            }else{
                $bodyExpired += "<strong>Aucun</strong>"
            }
    
            if(-not [string]::IsNullOrEmpty($credentialsExpireSoon)) 
            {
                $bodyExpireSoon += ($credentialsExpireSoon | Select-Object DisplayName,CredentialType,StartDate,ExpiryDate,ExpireIn,Usage,Owners | ConvertTo-Html -Fragment -As Table -PreContent "<h3>Expire soon</h3>") -replace "<table>","<table class='RepportUser'>"
            }else{
                $bodyExpireSoon += "<strong>Aucun</strong>"
            }
            $TEXT_TITRE = "Azure App credential limite notification"
            $TEXT_INTRO  = "Below are the details of the credentials for 'App registrations' in Azure (certificates and shared secrets) that are either expiring soon or already expired."
            $TABLE_HTML  = $bodyExpired + $bodyExpireSoon
            $TEXT_ACTION = $errMailAD
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_AzureAppCredLimite.html" -Encoding utf8 -Force
        
            Log "Script" "File generate - Application Expire soon. `r`n`t [$Path_Result\$($Date_Logs_File)_AzureAppCredLimite.html]" 1 Yellow      
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
            Log "Script" "Mail not sent - No mailbox has reached the $(wsize $seuilMail)  limit" 2 Green
        }
        #endregion
        Disconnect-MsGraphTenant

    }
    catch 
    {
        Get-DebugError $_
        Disconnect-MsGraphTenant
        exit -1
    }
}
End 
{
    try
    {
        $Temps = ((Get-Date )-(Get-Date $StartScript)).ToString().Split('.')[0]
        Log "Script" "Running time : " 1 Cyan -NoNewLine ;  Log "Script" "[$($Temps.Split(':')[0])h$($Temps.Split(':')[1])m$($Temps.Split(':')[2])s]" 1 Red -NoDate
        Log "Script" "Script end : "   1 Cyan -NoNewLine ;  Log "Script" "[$($MyInvocation.MyCommand.Name)]" 1 Red -NoDate
        exit 0
    }
    catch 
    {
        Get-DebugError $_
        exit -1
    }
}
