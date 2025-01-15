<#
.SYNOPSIS
    This script is used to monitor and generate reports related to Active Directory health using PingCastle utility.

.DESCRIPTION
    The script automates the execution of the PingCastle tool to generate a health check report for Active Directory environments.
    It validates prerequisites, manages script configurations, and sends the generated report via email to specified administrators.
    Log files and generated reports are organized and maintained according to the configured retention policy.

.PARAMETER VerboseLvl
    Defines the level of verbosity in the script's output.
        - 0: No output to console.
        - 1: Displays errors only.
        - 2: Displays basic information and errors.
        - 3: Displays standard messages, basic information, and errors.
        - 4: Displays detailed messages, standard information, and errors.
        - 5: Displays debug information, detailed messages, standard information, and errors.


.PARAMETER Domain
    Specifies the target Active Directory domain for the health check. By default, the script uses the current domain of the system.

.PARAMETER ResultPath
    Specifies the destination path to save the PingCastle report results. If not specified, the results are saved in the script directory.

.EXAMPLE
    PS> .\Run-WBPingCastle.ps1 -VerboseLvl 0
    Executes the script in silent mode in current domain, logging actions without displaying them in the console.

    PS> .\Run-WBPingCastle.ps1 -VerboseLvl 2 -Domain OtherDomain.tld
    Runs the script with detailed logging on domain 'OtherDomain.tld'.

    PS> .\Run-WBPingCastle.ps1 -ResultPath "C:\PingCastleResult"
    Runs the script and save PingCastle repport in specified directory

.INPUTS
    JSON File

.OUTPUTS
    The script generates:
    - HTML files containing the PingCastle report.
    - Logs stored in the configured Logs directory.
.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Run-WBPingCastle/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Run-WBPingCastle/Run-WBPingCastle.ps1

.NOTES
    Additional Notes:
    
    Ensure the PingCastle tool is placed in the script's root directory before execution.

    Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.

    Author: Damien Aubril

    >License: Not applicable

    >Date: December 4, 2024
    
    Version: 1.0

    Change Log :
        - Update - 12/12/2024
#>



[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 2,
    [Parameter(Mandatory = $false, Position = 1)][string]$Domain,
    [Parameter(Mandatory = $false, Position = 2)][string]$ResultPath = $null
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
                [PSCustomObject]$Script_Param  = $Params.Script

            # Get configuration values for files to keep and maximum space
                [int]$FilesToKeep = $Generic_Param.FilesToKeep
                [long]$SpaceMax   = Invoke-Expression $($Generic_Param.SpaceToUseByScriptsMax)

            # Get configuration values for Script Variable
                [string]$PingCastleVersion = $Script_Param.PingCastleVersion
                [string]$HTMLTemplatePath  = $Script_Param.TemplateHTMLPath
        #endregion

        #region Variables Global
        
        #endregion

        #region Script Functions

        #endregion
     
        #region Initialisation

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
        #region Checking the presence of PingCastle binaries (.exe) in the desired version
        Log "Script" "Checking the 'PingCastle' utility" 1 Cyan
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

        $PingCastleFolder = $null
        $PingCastleGoodFolder = $null
        
        $PingCastleFolder = Get-ChildItem $Path_Root -Directory | Where-Object {$_.Name -like "PingCastle*" } | Select-Object FullName,Name,@{l='Version';e={($_.Name -split "_")[1]}},Attributes

        # Only one version of PingCastle was found.
        if ($null -ne $PingCastleFolder -and $null -eq $PingCastleFolder.count) 
        {
            Log "Script" "`tOnly one version of PingCastle was found." 1 Green
            $PingCastleGoodFolder = ($PingCastleFolder | Where-Object {$_.Name -like "*$PingCastleVersion*" })
        }
        # Multiple versions of PingCastle were found.
        elseif ($null -ne $PingCastleFolder -and $PingCastleFolder.count -ge 2) 
        {
            Log "Script" "`tMultiple versions of PingCastle were found. Using version $PingCastleVersion" 1 Yellow
            $PingCastleGoodFolder = ($PingCastleFolder | Where-Object {$_.Name -like "*$PingCastleVersion*" })
        }
        # PingCatsle not found
        else 
        {
            Log "Script" "`tError - Unable to locate the folder containing 'PingCastle', please, verify name folder contain PingCastle*" 1 Red
            exit -1
        }
        #endregion

        #region Executing PingCastle
        if ($null -ne $PingCastleGoodFolder){
            $loc = Get-Location
            Set-Location $PingCastleGoodFolder.FullName
            Log "Script" "Start PingCastle version $($PingCastleGoodFolder.Version)" 1 Green     
            try {
                
                . "$($PingCastleGoodFolder.FullName)\PingCastle.exe" --no-enum-limit --healthcheck --server $DomainDNSName
            }
            catch {
                Log "Script","Error" "An error occure during PingCastle execution. Domain : $DomainDNSName" 1 Red
                Get-DebugError $_
            }      
            
            Set-Location $loc
        }else{
            Log "Script" "Error - The detected version of PingCastle ($($PingCastleFolder.Version)) does not match the desired version ($PingCastleVersion)" 1 Red
            exit -1
        }
        #endregion

        Start-Sleep -Seconds 3

        #region Moving the file generated by PingCastle to the Result folder
        [string[]]$PingCastleRepport = $null
        foreach ($report in $(Get-Item "$($PingCastleGoodFolder.FullName)\*$DomainDNSName*" | Select-Object FullName,Extension)){
            #Rename file with date
            $rp = $report.FullName -replace "$($report.Extension)","_$(Get-Date -Format "yyyy_MM_dd_hh_mm")$($report.Extension)"
            Move-Item $($report.FullName) $Path_Result$(split-path $rp -leaf) -force
            $PingCastleRepport += "$Path_Result$(split-path $rp -leaf)"
            Log "Script" "File moved [$($report.FullName)]`r`n To $("$Path_Result$(split-path $rp -leaf)")" 2 Magenta
        }
        #endregion

        #region Sending an email if the report is generated
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ($null -ne $PingCastleRepport) 
        {
            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
            }


            # Retrieving the global domain note in HTML file
            [string]$Note = ""
            try 
            {
                Get-Content $($PingCastleRepport | Where-Object {$_ -like "*.html"}) | Select-String '(Domain Risk Level:\s+\d+\s+\/\s+\d+)' | ForEach-Object {
                    $Note = $_.Matches[0].Groups[1].Value
                }
            }
            catch 
            {
                $Note = "Unable to retreive PingCastle Note on HTML result"
            }
            

            $TEXT_TITRE = "Webi-Time - Weekly PingCastle Report"
            $TEXT_INTRO  = "You will find the PingCastle report of the day attached."
            $TEXT_ACTION = ""
            $TABLE_HTML  = $Script:Note
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 
        
            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_PingCastleRepport.html" -Encoding utf8 -Force
            Log "Script" "Generated file [$Path_Result\$($Date_Logs_File)_PingCastleRepport.html])" 1 Yellow
            #Attachment = $PingCastleRepport
        }
        #endregion
    }
    catch 
    {
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
        Log "Script" "Script end : "   1 Cyan -NoNewLine ;  Log "Script" "[$($MyInvocation.MyCommand.Name)]" 1 Red -NoDate
        exit 0
    }
    catch 
    {
        Get-DebugError $_
        exit -1
    }
}