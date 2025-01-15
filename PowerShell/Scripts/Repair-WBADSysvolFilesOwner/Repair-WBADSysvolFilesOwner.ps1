<#
.SYNOPSIS
    This script repairs broken file or folder ownership in Active Directory SYSVOL. It verifies the current owner, checks for privilege issues, 
    and allows for repairing broken owner information in files within the SYSVOL folder.

.DESCRIPTION
    The script scans files and folders in the SYSVOL directory of an Active Directory domain, checking if the ownership is correct. 
    If any file or folder has an incorrect owner (based on group membership), the script repairs the owner to the correct group. 
    It supports both automatic and manual owner selection, as well as generating an HTML report detailing the status of each file/folder.

    
.PARAMETER VerboseLvl
    Defines the level of verbosity in the script's output.
        - 0: No output to console.
        - 1: Displays errors only.
        - 2: Displays basic information and errors.
        - 3: Displays standard messages, basic information, and errors.
        - 4: Displays detailed messages, standard information, and errors.
        - 5: Displays debug information, detailed messages, standard information, and errors.

.PARAMETER Domain
    Specifies the target Active Directory domain to use for the operation. By default, the script uses the current domain of the system.

.PARAMETER GPOwner
    Specifies the new owner for the SYSVOL files and folders. If not provided, the user will be prompted to select the owner manually.

.PARAMETER rootPath
    Indicates whether to scan the root of the SYSVOL directory. If specified, the script will process the root path as well as any subdirectories.

.PARAMETER ShowNotBroken
    Specifies whether to include files/folders that are already correctly owned in the report.
        - $true: Include not broken files/folders.
        - $false: Exclude not broken files/folders from the report.

.PARAMETER Repair
    Indicates whether to attempt to repair broken owner information. If specified, the script will attempt to fix ownership issues.
        - $true: Attempt to repair broken ownership.
        - $false: Only analyze without making changes.

.PARAMETER RepairAll
    If specified, the script will attempt to repair all files and folders their ownership is not equal to desired owner. This includes both broken and correctly owned files.

.PARAMETER ResultPath
    The path where the result files will be stored.  If not specified, the results are saved in the script directory.

.EXAMPLE
    PS> .\Repair-WBADSysvolFilesOwner.ps1 -VerboseLvl 0 -Repair 
    Executes the script in silent mode, attempts to repair broken ownership in SYSVOL, and saves the results in the default path.

    PS> .\Repair-WBADSysvolFilesOwner.ps1 -VerboseLvl 2 -Domain "otherDomain.local" -ShowNotBroken 
    Scans SYSVOL on the specified domain 'otherDomain.local', includes not broken files in the report, and provides detailed logging.

    PS> .\Repair-WBADSysvolFilesOwner.ps1 -Repair -RepairAll -ResultPath "C:\Reports\SYSVOL_Report.html"
    Attempts to repair all files and folders in SYSVOL, including those with correct ownership, and saves the report to the specified path.

.OUTPUTS
    The script generates:
    - HTML reports for files and folders in SYSVOL with broken or corrected ownership information.
    - Logs stored in the configured Logs directory.

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Repair-WBADSysvolFilesOwner/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Repair-WBADSysvolFilesOwner/Repair-WBADSysvolFilesOwner.ps1

.NOTES
    Additional Notes:
    
    Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.
        
    Author: Damien Aubril

    >License: Not applicable

    >Date: January 12, 2025
    
    Version: 1.0
    
    Change Log :
        - Update - 13/01/2024
#>

[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 2,
    [Parameter(Mandatory = $false, Position = 1)][string]$Domain=$null,
    [Parameter(Mandatory = $false, Position = 2)][string]$GPOwner=$null,
    [Parameter(Mandatory = $false, Position = 3)][switch]$rootPath=$false,
    [Parameter(Mandatory = $false, Position = 4)][switch]$ShowNotBroken=$false,
    [Parameter(Mandatory = $false, Position = 5)][switch]$Repair=$false,
    [Parameter(Mandatory = $false, Position = 6)][switch]$RepairAll=$false,
    [Parameter(Mandatory = $false, Position = 7)][string]$ResultPath = $null

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
                [PSCustomObject]$ExcludeGroups  = $Script_Param.ExcludeGroups 
                [string]$HTMLTemplatePath  = $Script_Param.TemplateHTMLPath

        #endregion

        #region Variables Global

            $Global:Analyse = $false
            $Global:Power = $false

        #endregion

        #region Script Functions

        function Add-TableItem{
            param (
                [string] $type,
                [string] $Path,
                [string] $Name,
                [string] $whencreated,
                [string] $CurrentOwner,
                [string] $newowner,
                [string] $listetype
            )
            if($type -eq "Directory"){
                $type = "Folder"
            }else{
                $type = "File"
            }
            $Hash = [ordered]@{
                Type              = $type
                Path              = $Path
                "File Name or GPO Name" = $Name
                Created           = $whencreated
                Current_Owner     = $CurrentOwner
                New_Owner         = $newowner 
            }

            $Object = [PSCustomObject]$Hash

            switch ($listetype) 
            {
                'OK' { 
                    $script:NotBroken_FileOrFolder += $Object
                    $script:Nbrs_NotBroken_FileOrFolder++
                }
                'NOK' {
                    $script:Broken_FileOrFolder += $Object
                    $script:Nbrs_Broken_FileOrFolder++
                }
            }

        }

        function Repair-BrokenOwner{
            param (
                [string]$path,
                $newOwner
            )
        
            if ($Global:Power -and (!$Global:Analyse))
            {                
                try 
                {
                    $acl = Get-Acl $path
                    $acl.SetOwner([System.Security.Principal.SecurityIdentifier]$newOwner.SID)
                    Set-Acl -Path $path -AclObject $acl 
                    Log "Script" "Owner of $path has been changed to $($newOwner.Name)" 1 Green
                    return $newOwner.Name
                }
                catch 
                {                    
                    Get-DebugError $_
                    return "Error - Can't change Owner"  
                }
            }
            if ($Global:Analyse)
            {
                Log "Script" "Not Set - Analyse Only" 2 Magenta
                return "Not Set - Analyse Only"
            }
            else
            {
                return "Insuficient Right"
            }
            
        }

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
        #endregion

        #region Verification des privileges du compte
            Log "Script" "Verification des privileges du compte [$($env:USERNAME)]" 1 Magenta
            try 
            {

                $User = Get-ADObject -LdapFilter "(&(objectClass=user)(SamAccountName=$($env:USERNAME)))" -Properties * -Server $(Get-ADDomain $env:USERDOMAIN).DNSRoot

                # Recuperation des groupes du compte
                $UserGroups = Get-ADGroup -LDAPFilter ("(member:1.2.840.113556.1.4.1941:={0})" -f $($User.DistinguishedName)) -Server $(Get-ADDomain $env:USERDOMAIN).DNSRoot | Select-Object Name,SamAccountName,SID
                Log "Script" "Account is Member Of : `r`n$($UserGroups | ForEach-Object{"`tSID : $(($_.SID -split "-")[-1])`t- $($_.Name)`r`n"})" 3 Cyan

                # Verification si il fait partie d'un groupe Admins (Domain Admin / Enterprise Admin)
                if (($UserGroups.SID -match "-512" -or $UserGroups.SID -match "-544" -or $UserGroups.SID -match "-519"))
                {
                    Log "Script" "Le compte '$($User.sAMAccountName)' est membre d'un groupe Admin" 1 Green
                    
                        #  Si le paramatre -Repair est spécifié 
                    if($Repair)
                    {
                        $Global:Power = $true
                    }
                    else
                    {
                        Log "Script" "Le parametre -Repair n'est pas specifie :" 2 Yellow
                        Log "Script" "`t`tANALYSE ONLY" 2 Red
                        $global:Analyse = $true
                    }
                }
                else 
                {
                    Log "Script" "Le compte '$($User.sAMAccountName)' doesn't have the privilege to set Owner object" 1 Red      
                    Log "Script" "`t`tANALYSE ONLY" 2 Red
                    $global:Analyse = $true                  
                }
            }
            catch 
            {
                Get-DebugError $_ 
                Throw $_
            }

        #endregion

        #region Recuperation des groupes par defaut Active Directory

        # Initialize an array to store privilege groups to skip
        [array]$skipdefaultgroups = @()

        # Construire le contexte LDAP pour le domaine spécifié
        $LDAPPath = "LDAP://$DomainDNSName"
        
        # Effectuer la requête pour exclure les groupes par défaut
        #$Searcher1 = [adsisearcher]"(&(groupType:1.2.840.113556.1.4.803:=1)(!(objectSID=S-1-5-32-546))(!(objectSID=S-1-5-32-545)))"
        #$Searcher1.SearchRoot = [ADSI]$LDAPPath
        #$SkipDefaultGroups += $Searcher1.FindAll().Properties.name

        $Searcher2 = [adsisearcher]"(&(objectCategory=group)(admincount=1)(iscriticalsystemobject=*))"
        $Searcher2.SearchRoot = [ADSI]$LDAPPath
        $SkipDefaultGroups += $Searcher2.FindAll().Properties.name

        # Get optional group names
        $varoptionalgroup = [ADSI]("LDAP://CN=Schema,CN=Configuration," + ($dom.DistinguishedName))
        $optionalGroupNames = $varoptionalgroup.PsBase.ObjectSecurity.Access.identityreference.value | ForEach-Object { $_.Split("\")[1] }

        # Add unique optional group names to the skipdefaultgroups array
        $skipdefaultgroups = $SkipDefaultGroups + $optionalGroupNames | Select-Object -Unique
        
        # Add groups to the $ExcludeGroups variable in the JSON config file to include them in the $skipdefaultgroups list.
        foreach ($grp in $ExcludeGroups) {
            $skipdefaultgroups += $grp
        }
        Log "Script" "skipdefaultgroups : `r`n$($skipdefaultgroups|Sort-Object | ForEach-Object{"`t- $($_)`r`n"})" 4 Cyan
        #endregion

       
        #region Selection du dossier a analyser
        [array]$script:Broken_FileOrFolder = $null
        [int]$script:Nbrs_Broken_FileOrFolder = 0

        [array]$script:NotBroken_FileOrFolder = $null
        [int]$script:Nbrs_NotBroken_FileOrFolder = 0
        
        [int]$script:Nbrs_Scanned_FileOrFolder = 0

        $folderPath = "\\$DomainDNSName\sysvol\$DomainDNSName\"

        if($rootPath)
        {
            $res = (Get-Item $folderPath) | Select-Object Mode,LastWriteTime,Name,FullName
        }
        else
        {
            [array]$allPath = @()
            $allPath += (Get-Item $folderPath) | Select-Object Mode,LastWriteTime,Name,FullName 
            $allPath += (Get-ChildItem $folderPath) | Select-Object Mode,LastWriteTime,Name,FullName   
            $res = $allPath | Out-GridView -PassThru -Title "Select Root Folder" -ErrorAction Stop 
            if ($null -eq $res)
            {
                throw "Aucun dossier choisis"
            }
        }
            
        #endregion 

        #region Selection du nouveau Owner pour les dossiers/fichiers du SYSVOL
        
            $grouplist = $null
            $grouplist = @()
        
            # Construire le contexte LDAP pour le domaine spécifié
            $LDAPPath = "LDAP://$DomainDNSName"
            $Searcher3 = [adsisearcher]"(&(objectCategory=group)(admincount=1)(iscriticalsystemobject=*))"
            $Searcher3.SearchRoot = [ADSI]$LDAPPath
            $Searcher3.FindAll().Properties | ForEach-Object {

                #List group contains admins domain or entreprise or administrator 
                $sidstring = (New-Object System.Security.Principal.SecurityIdentifier($_["objectsid"][0], 0)).Value 

                if ($sidstring -like "*-512" -or $sidstring -like "*-519" -or $sidstring -like "*-544") 
                { 
                    $grouplist += $_.samaccountname
                    Log "Script" "$($_.name) $sidstring" 2 Gray
                }
                [psobject[]]$ADGroupsList = $null
                foreach ($grpl in $grouplist) 
                {
                    $ADGroupsList += Get-ADGroup $grpl -Server $DomainDNSName | Select-Object Name,SamAccountName,SID
                }
            }
            if ("" -ne $GPOwner)
            {            
                if ($r=$ADGroupsList -match $GPOwner)
                {
                    $groupecorrect = $r[0]
                    Log "Script" "AUTO - The new owner '$GPOwner' comes from the powershell command match with [$groupecorrect]" 1 DarkGray
                }
                else
                {
                    Log "Script" "AUTO - The new owner '$GPOwner' from the powershell command does not correspond to the groups [- $($grouplist | ForEach-Object{$_ + ' -'})]" 1 Red
                    exit -1
                }
            }
            else
            {
                $groupecorrect = $ADGroupsList | Out-GridView -PassThru -Title "Select New Owner" -ErrorAction Stop 
                if ($null -eq $groupecorrect)
                {
                    Throw "Aucun Owner selectionner. Exit"
                }
                Log "Script" "MANUAL - You have chose '$groupecorrect' for new owner" 2 Yellow
            }
            

        #endregion
        
        #region Recuperation des fichiers contenu dans SYSVOL et traitement
        Log "Script" "Getting all files ..." 1 Green
        $AllFile = Get-ChildItem -Path $res.FullName -Recurse -ErrorAction SilentlyContinue
        $nbFile = $($AllFile.count)
        Log "Script" "Find $nbFile files ..." 1 Green
        Log "Script" "Getting all GPO Name ..." 1 Green
        $AllGPO = Get-GPO -All -Domain $DomainDNSName -Server $DomainDNSName | Select-Object @{l='DisplayName';e={"GPO : $($_.DisplayName)"}}, ID
        

        $AllFile | ForEach-Object {
            try
            {
                $Name = $_.Name
                $FullName = $_.FullName
                Log "Script" "We scanne $name" 3 Yellow 

                $CurrentOwner = (Get-Acl $FullName).Owner.Split("\")[1]
                Log "Script"  "$((Get-Acl $FullName).Owner) - Owner = $CurrentOwner" 3 gray 

                $FolderGPOName = "$(($AllGPO | Where-Object {$name -like "*$($_.id)*"}).DisplayName)"
        
                #check if owner is different from the array
                if ($skipdefaultgroups -notcontains $CurrentOwner -or ($RepairAll.IsPresent -eq $true -and $groupecorrect.Name -ne $CurrentOwner)) 
                { 
                    if($name.StartsWith('{') -and $name.EndsWith('}') )
                    {
                        $newowner = Repair-BrokenOwner $FullName $groupecorrect
                        Add-TableItem $_.Attributes $_.FullName $FolderGPOName $_.CreationTime $CurrentOwner $newowner NOK
                    }
                    else
                    {
                        $newowner = Repair-BrokenOwner $FullName $groupecorrect
                        Add-TableItem $_.Attributes $_.FullName $Name $_.CreationTime $CurrentOwner $newowner NOK
                    }                     
                }
                elseif ($ShowNotBroken)
                {
                    if($name.StartsWith('{') -and $name.EndsWith('}') )
                    {
                        Add-TableItem $_.Attributes $_.FullName $FolderGPOName $_.CreationTime $CurrentOwner "OK" OK                        
                    }
                    else
                    {
                        Add-TableItem $_.Attributes $_.FullName $Name $_.CreationTime $CurrentOwner "OK" OK
                    } 
                }
                $name = $FullName = $null 
                $Nbrs_Scanned_FileOrFolder ++

            }
            catch 
            {
                Log "Script" "[$FullName] - Error $_" 1 red
                Get-DebugError $_
            }
        }
        #endregion
       
        #region CreateHTML
            $html = $null
            $htmlBody = $null
            $Broken_FileOrFolder_Html = $null
            $NotBroken_FileOrFolder_Html = $null

            #Format HTML Head and page 
            $head = @"
            <style  type="text/css">
                body { 
                    background-color:#FFFFFF;
                    font-family:Calibri;
                    font-size:12pt; 
                }
                h1{
                    background-color:green;
                    color:white;
                    text-align: center;
                }    
                h3 {
                    font-family:Tahoma;
                    color:#6D7B8D;
                }
                td, th { 
                    border:0px solid black; 
                    border-collapse:collapse;
                }
                th { 
                    color:white;
                    background-color:Dodgerblue; 
                }
                table, tr, td, th {    padding: 2px; margin: 0px }
                tr:nth-child(odd) {    background-color: lightgray }
                table {
                    width:95%;
                    margin-left:10px; 
                    margin-bottom:20px;
                }
                caption {
                    background-color:#FFFF66;
                    text-align:left;
                    font-weight:bold;
                    font-size:14pt;
                }
                #tr:nth-child(n + 50) {    visibility: hidden;}

                table#NOK tr {
                    background-color:#ff9999;
                }
                table#OK tr {
                    background-color:#1c9b3c;
                }
                

            </style>
"@


            # Generate HTML page style
            $htmlBody += "<div style='float: right; font-size: 35px; border: solid 1px red; margin-top: 25px;'>Domain: <b>$DomainDNSName</b></div>"
            $htmlBody += "<h3>Repair-WBADSysvolFilesOwner</h3>"
            $htmlBody += "<h3>$($global:Date_Logs_File) / Scanned Object: $Nbrs_Scanned_FileOrFolder</h3>"

            # Convert broken objects to HTML fragments
            $Broken_FileOrFolder_Html    = ($script:Broken_FileOrFolder    | ConvertTo-Html -Fragment -PreContent "<h1>Broken Files and Folders : $script:Nbrs_Broken_FileOrFolder</h1>") -replace "<table>","<table id='NOK'>"
            if ($ShowNotBroken){
                $NotBroken_FileOrFolder_Html = ($script:NotBroken_FileOrFolder | ConvertTo-Html -Fragment -PreContent "<h1>Not Broken Files and Folders : $script:Nbrs_NotBroken_FileOrFolder</h1>") -replace "<table>","<table id='OK'>"
            }
            # Combine HTML fragments
            $htmlBody += $Broken_FileOrFolder_Html + $NotBroken_FileOrFolder_Html 

            # Convert to complete HTML
            $html = ConvertTo-Html -Body $htmlBody -Head $head

            # Apply styling to specific table cells
            $html = $html -replace "<td>Error -", "<td style='background-color: red;'>Error -"
            $html = $html -replace "<td>Insuficient", "<td style='background-color: Yellow;'>Insufficient"
            $html = $html -replace "<td>Not", "<td style='background-color: Aqua;'>Not"
            $html = $html -replace "<table>", "<table class='RepportUser'>"
        #endregion
        
        #region Sending an email if disabled users without account deactivation information are found
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ($null -ne $script:Broken_FileOrFolder -or ($null -ne $script:NotBroken_FileOrFolder -and $ShowNotBroken.IsPresent -eq $true) ) 
        {
            $html | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_report-brokenowner.html" -Encoding utf8 -Force
            # $HTML peut etre en pièce jointe !

            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
            }

            $TEXT_TITRE = "Sysvol File found with wrong owner"
            $TEXT_INTRO  = "You can find in attachement modified files."
            $TABLE_HTML  = ($script:Broken_FileOrFolder | Select-Object * | ConvertTo-Html -Fragment -As Table) -replace "<table>", "<table class='RepportUser'>" -replace "<td>Error -", "<td style='background-color: red;'>Error -" -replace "<td>Insuficient", "<td style='background-color: Yellow;'>Insufficient" -replace "<td>Not", "<td style='background-color: Aqua;'>Not"
            $TEXT_ACTION = ""
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_report-BrokOwnMail.html" -Encoding utf8 -Force
           
            Log "Script" "File generate - Some files found with wrong owner. date`r`n`t $Path_Result$($Date_Logs_File)_$($DomainDNSName)_report-brokenowner.html" 1 Yellow  
            
            
        }else{
            Log "Script" "Aucune action effectuee. Tout les fichiers ont les droits demandes." 1 Green
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
