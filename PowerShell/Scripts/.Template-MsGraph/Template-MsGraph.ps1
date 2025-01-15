<# 
.SYNOPSIS
    minute description

.DESCRIPTION
    This script description

.PARAMETER VerboseLvl
    Specifies the level of verbosity for logging. Logs are always written to a file, but console output varies:
    - `0`: No console output (silent mode). All output is logged to the file.
    - `1`: Minimal logging. Root level information and errors are displayed.
    - `2`: Basic logging. Displays basic information and errors. (DEFAULT)
    - `3`: Standard logging. Displays standard log messages, basic information, and errors.
    - `4`: Verbose logging. Displays detailed log messages, standard information, and errors.
    - `5`: Ultra verbose logging. Displays debug information, detailed log messages, standard information, and errors.


.INPUTS
    - JSON File with tenant information
    - Variable : description

.EXAMPLE
    PS> .\script.ps1 -paramater

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Template/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Template/Template.ps1
.NOTES
    Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.

    Author = 'AUBRIL Damien'
    Creation Date : 26/10/2023
    Version : 2.0
    Version Date : 05/09/2024
#>

[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false)][ValidateSet(0, 1, 2, 3, 4, 5)]
    [byte]$VerboseLvl = 2
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
                [string]$Path_Result = $null # $Path_Root + "\Results\"

            # Get the date in "yyyy-MM-dd-HH-mm-ss" format for log files
                [string]$global:Date_Logs_File = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
                        $global:VerboseLvl = $VerboseLvl
        #endregion

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
                [string]$tenantName      = $Tenant_Param.tenantName
             
            # Variables du script
                [string]$FromMail       = $Script_Param.Mail.FromMail
                [string]$ToMail         = $Script_Param.Mail.ToMail
                [string]$mailTemplatePath = $Script_Param.Mail.TemplatePath
        #endregion

        #region Modules
            
            try{
                Write-Output "Loading Modules"
                Import-Module -Name ModuleGenerics -Force -ErrorAction Stop
            }
            catch 
            {                
                Write-host "You must place the [ModuleGenerics] in one of the following appropriate folders before running the scripts : `n`r`t - $($env:USERPROFILE)\Documents\WindowsPowerShell\Modules`n`r`t - C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules" -f Red
                Write-host "More information at the begin of psm1 file" -ForegroundColor Yellow
                exit 1
            } 
            try{  
                Test-PackageProvider "NuGet" 
                #Test-PackageProvider "PowerShellGet"

                $GraphModulesList =  "Authentication","Users","Groups","Mail","Calendar","Reports","Identity.DirectoryManagement" 
                #$OthersModulesList = "ExchangeOnlineManagement","MSOnline"
                if(-not (Test-Modules ($GraphModulesList + $OthersModulesList)))
                {
                    if($AllowBeta){
                        [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name
                    }else{
                        [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name | Where-Object {$_ -notlike "*beta*"}
                    }
                    if ($PSVersionTable.PSVersion -like "7.*")
                    {
                        throw "Ne fonctionne pas avec PowerShell 7 a cause du module MSOL"
                    }
                    else
                    {
                        $vrs =  $null; # $vrsExOn =  $null; $vrsMsol = '1.1.183.66' 
                    }
                    Install-GraphModuleInduviduals $GraphModulesList -DesiredVersion $vrs
                    Import-GraphModuleInduviduals $GraphModulesList -DesiredVersion $vrs
                    
                    #Install-ModuleUserV2 "ExchangeOnlineManagement" -DesiredVersion $vrsExOn
                    #Import-ModuleUserV2 "ExchangeOnlineManagement" -DesiredVersion $vrsExOn

                    #Install-ModuleUserV2 "MSOnline" -DesiredVersion $vrsMsol
                    #Import-ModuleUserV2 "MSOnline" -DesiredVersion $vrsMsol
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

        #endregion

        #region function
       
            <# ##############################################################################

                                        FUNCTION HERE

            #> ##############################################################################
        
        
        #endregion

        
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

        #endregion
        
    }
    catch 
    {
        Get-DebugError $_ 
        exit 1
    }
    
}
Process
{

    try 
    {
        Log "Script" "Start of script : $($MyInvocation.MyCommand.Name)" 99 Cyan  
        # Deconnexion au cas ou mais sans erreur a afficher
        Disconnect-MsGraphTenant -Type Silently | Out-Null
        Connect-MsGraphTenant -ClientId $clientId -TenantId $tenantId -CertThumbprint $CertThumbprint


        <# ##############################################################################

                                    SCRIPT HERE

        #> ##############################################################################
        
 
        #region MAIL
            #region For send EMAIL with Text

                [string]$ObjectMessage = "AZURE AD CONNECT - SYNC IS BROKEN!"
                [string]$BodyMessage = $mailTemplate -replace "!--MAX_ALERT--!" , $MaxMinutes `
                                                    -replace "!--REAL_DATE--!", $RealDate `
                                                    -replace "!--DELTA_DATE--!", $(WDate -dateW $Difference -typeInput Hour) `
                                                    -replace "!--ERROR_MAIL--!", $errMailAD
            #endregion
            
            #region For send EMAIL with Table
                for ($i = 0; $i -lt 3; $i++) {
                    $Users += [PSCustomObject]@{
                        "Nom d'utilisateur" = "Titi $i"
                        "UPN"               = "titi$i@domain.com"
                        "Option1"           = "option$i"
                    }
                }        
                [string]$ObjectMessage = "User DEFAULT"
                [string]$BodyMessage = $mailTemplate -replace "!--TABLE_USERS--!", $(($Users | Select-Object * | ConvertTo-Html -Fragment -As Table )) `
                                                     -replace "!--ERROR_MAIL--!", $errMailAD
            #endregion
            try
            {
                if (-not [string]::IsNullOrEmpty($errMailAD)) 
                {
                    $ErrorLogFile = Get-ChildItem "$global:Path_Logs\Error" -Recurse | Where-Object {$_.Name -like "*$($global:Date_Logs_File)*" | Select-Object -First 1} 
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage -Attachments $ErrorLogFile.FullName
                    Log "Script" "Mail sent with error - <about mail content>" 2 Yellow
                }
                else
                {
                    SendMail -FromMail $FromMail -ToMail $ToMail -MailSubject $ObjectMessage -MailBody $BodyMessage
                    Log "Script" "Mail sent : <about mail content>" 2 Green
                }
            } 
            catch 
            { 
                Log "Script" "Error - Unable to send mail" 1 Red
                Get-DebugError $_             
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
       
        #Set-Location $oldLocation
        exit 0
    }
    catch 
    {
        Get-DebugError $_
        exit 1
    }

}

