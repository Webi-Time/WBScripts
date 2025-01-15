<# 
.SYNOPSIS
    Checks BitLocker status for computers in Active Directory and sends an email alert for missing recovery keys.

.DESCRIPTION
    This script queries Active Directory for computer objects, checks their BitLocker recovery keys, and sends an email 
    alert if any computers are missing recovery keys..

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
    
.EXAMPLE
    PS> .\Check-WBBitLocker.ps1

.EXAMPLE
    PS> .\Check-WBBitLocker.ps1 -VerboseLvl 2

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-WBBitLocker/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-WBBitLocker/Check-WBBitLocker.ps1

.NOTES
    Additional Notes:
    Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.


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
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 2,
    [Parameter(Mandatory = $false, Position = 1)][string]$Domain
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
            
            try
            {
                Import-Module -Name ModuleGenerics -Force -ErrorAction Stop
                Import-Module -Name ActiveDirectory -Force -ErrorAction Stop
            }
            catch 
            {                
                Write-host "You must place the [ModuleGenerics] in one of the following appropriate folders before running the scripts : `n`r`t - $($env:USERPROFILE)\Documents\WindowsPowerShell\Modules`n`r`t - C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules" -f Red
                Write-host $_.Exception.Message
                exit -1
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

                [string]$errMailAD = $null

                [string]$base = $Script_Param.OUBase
                [string[]]$exceptionList = $Script_Param.ComputerToExclude
                
        #endregion 

        #region Variables Global
           
        #endregion
            
        #region Script Functions
            
        #endregion
               
        #region Initialisation

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
        #region Verification du domaine
        Log "Script" "Verification du nom de domaine" 1 Magenta
        try 
        {
            # Si le paramatre -Domain est spécifié 
            if (-not [string]::IsNullOrEmpty($Domain))
            {
                Log "Script" "`tRecuperation des informations du domaine : [$Domain]" 1 DarkMagenta
                $Dom = Get-ADDomain -Server $Domain -ErrorAction Stop
            }
            # Sinon on prends le domaine actuel
            else
            {
                Log "Script" "`tRecuperation des informations du domaine : [$($env:USERDNSDOMAIN)]" 1 DarkMagenta
                $Dom = Get-ADDomain -Server $env:USERDNSDOMAIN -ErrorAction Stop
            }       
            $DomainDNSName = ($Dom).DNSRoot
            
        }
        catch 
        {
            Log "Script" "`tImpossible recuperer les informations du domaine" 1 Red
            Get-DebugError $_
            exit -1
        }
        
  
        try
        {
            Log "Script" "Retrieving the computer list" 1 Cyan
            $list_computers = Get-ADComputer -Filter {(Enabled -eq $True)} -SearchBase $base -Server $DomainDNSName -SearchScope Subtree -Property msTPM-OwnerInformation, msTPM-TpmInformationForComputer, PasswordLastSet
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
            $Bitlocker_Object = Get-ADObject -Filter {objectclass -eq 'msFVE-RecoveryInformation'} -SearchBase $computer.DistinguishedName -Properties 'msFVE-RecoveryPassword' -Server $DomainDNSName | Select-Object -Last 1

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

        #region Sending an email if users have just been disabled
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ((-not [string]::IsNullOrEmpty($ComputerWithoutRKey)) -or (-not [string]::IsNullOrEmpty($errMailAD)))
        {
            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
                throw $_.Exception.Message
            }

            $TEXT_TITRE = "Computer Bitlocker notification"
            $TEXT_INTRO  = "Below are the details of computers that do not have a 'BitLocker Recovery Key' in the Active Directory environment :"
            $TABLE_HTML  = $($ComputerWithoutRKey | Select-Object * | ConvertTo-Html -Fragment -As Table) -replace "<table>","<table class='RepportUser'>"
            $TEXT_ACTION = $errMailAD
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_ComputerWithoutRecoveryKey.html" -Encoding utf8 -Force
        
            Log "Script" "File generate - Computer without Bitlocker found. `r`n`t [$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_ComputerWithoutRecoveryKey.html]" 1 Yellow      
        }
        else
        {
            Log "Script" "Mail not sent - No computer without bitlocker" 2 Green
        }
        #endregion
    }
    catch {
        Get-DebugError $_
        exit -1
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
        exit -1
    }
}
