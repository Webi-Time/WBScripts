<#
.SYNOPSIS
	Analyzes all AD objects and their owners, and corrects them if the script is launched with an account 
    that has sufficient privileges.
.DESCRIPTION
    This script helps detect the owners of objects that are not "standard" and may represent a risk 
    (users, computers, groups, GPOs and organizational units).

    It generates an HTML page, and a CSV if the parameter has been specified.
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
  
.PARAMETER Repair
    Indicates whether to attempt to repair broken owner information. If specified, the script will attempt to fix ownership issues.
        - $true: Attempt to repair broken ownership.
        - $false: Only analyze without making changes.

.PARAMETER RepairAll
    If specified, the script will attempt to repair all AD Object their ownership is not equal to desired owner. This includes both broken and correctly owned files.

.PARAMETER ResultPath
    The path where the result files will be stored.  If not specified, the results are saved in the script directory.

.EXAMPLE
    PS> .\Repair-WBADObjectsOwner.ps1 -VerboseLvl 0 -Repair 
    Executes the script in silent mode, attempts to repair broken ownership in SYSVOL, and saves the results in the default path.

    PS> .\Repair-WBADObjectsOwner.ps1 -VerboseLvl 2 -Domain "otherDomain.local" -ShowNotBroken 
    Scans SYSVOL on the specified domain 'otherDomain.local', includes not broken files in the report, and provides detailed logging.

    PS> .\Repair-WBADObjectsOwner.ps1 -Repair -RepairAll -ResultPath "C:\Reports\SYSVOL_Report.html"
    Attempts to repair all files and folders in SYSVOL, including those with correct ownership, and saves the report to the specified path.

.OUTPUTS
    The script generates:
    - HTML reports for AD Object with broken or corrected ownership information.
    - Logs stored in the configured Logs directory.

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Repair-WBADObjectsOwner/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Repair-WBADObjectsOwner/Repair-WBADObjectsOwner.ps1

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
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 3,
    [Parameter(Mandatory = $false, Position = 1)][string]$Domain=$null,
    [Parameter(Mandatory = $false, Position = 2)][string]$GPOwner=$null,
    [Parameter(Mandatory = $false, Position = 3)][switch]$rootPath=$false,
    [Parameter(Mandatory = $false, Position = 4)][string]$OUPath=$null,
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
                    [string] $name,
                    [string] $samaccountname,
                    [string] $distinguishedname,
                    [string] $whencreated,
                    [string] $sids,
                    [string] $OS,
                    [string] $CurrentOwner,
                    [string] $newowner,
                    [string] $cat,
                    [string] $listetype
                )

                
                $Hash = [ordered]@{
                    Type              = $type
                    Name              = $name
                    SamAccountName    = $samaccountname
                    #DistinguishedName = $distinguishedname
                    Created           = $whencreated
                    #SID               = $sids
                    $cat              = $OS
                    Current_Owner     = $CurrentOwner
                    New_Owner         = $newowner 
                }

                if ($listetype -eq 'brokenou') {
                    $Hash.remove('SamAccountName')
                    $Hash.remove('SID')
                }
                if ($listetype -eq 'brokenGPO') {
                    $Hash.remove('SamAccountName')
                    $Hash.remove('SID')
                }

                $Object = [PSCustomObject]$Hash


                switch ($listetype) {
            
                    'brokenpc' { $script:brokenpc += $Object ; $script:NbrsbrokenPC++ }
                    'brokenusers' { $script:brokenusers += $Object; $script:nbrbrokenusers++ }
                    'brokengroups' { $script:brokengroups += $Object; $script:nbrbrokengroups++ }
                    'brokenou' { $script:brokenou += $Object; $script:nbrbrokenou++ }
                    'brokenGPO' { $script:brokenGPO += $Object; $script:nbrbrokenGPO++ }

                }

            }
            function Repair-BrokenOwner{
                param ( 
                    $ownerinfo  
                    )
                
            
            if ($Global:Power -and (!$Global:Analyse))
            {                
                    try 
                    {
                        $NewOwner = [System.Security.Principal.SecurityIdentifier]$groupecorrect.SID
                        $ownerinfo.PsBase.ObjectSecurity.SetOwner($NewOwner)
                        $ownerinfo.PsBase.CommitChanges() 
                        
                        Log "Script" "Owner of $($ownerinfo.distinguishedName) has been changed to $($groupecorrect.Name)" 1 Green
                        return $groupecorrect.Name
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

        #creating arrays that will contain noncompiding objects    
        #$brokenusers = $Object = $brokenpc = $null
        [array]$script:brokenusers = $null
        [int]$script:nbrbrokenusers = 0

        [array]$script:brokenpc = $null
        [int]$script:NbrsbrokenPC = 0

        [array]$script:brokengroups = $null
        [int]$script:nbrbrokengroups = 0

        [array]$script:brokenou = $null
        [int]$script:nbrbrokenou = 0

        [array]$script:brokenGPO = $null
        [int]$script:nbrbrokenGPO = 0
        
        [int]$script:nbrscanobject = 0


        if($rootPath)
        {
            Log "Script" "Verify all domain" 2 Cyan
                        
            $LDAPPath = "LDAP://$DomainDNSName"
            $Searcher = [adsisearcher]"(|(&(objectCategory=computer)(!(userAccountControl:1.2.840.113556.1.4.803:=8192)))(objectCategory=User)(groupType:1.2.840.113556.1.4.803:=2)(objectCategory=organizationalUnit)(objectCategory=GroupPolicyContainer))"
            $Searcher.SearchRoot = [ADSI]$LDAPPath
            $conditions = $Searcher.FindAll().Properties
        }
        else
        {
           Log "Script" "Verify $OUpath" 2 Cyan
           try 
           {
                Get-ADOrganizationalUnit $OUpath -Server $DomainDNSName -ErrorAction Stop
           }
           catch 
           {
            Log "Script" "unable to verifie $OUpath" 2 Red
            $Ouname = Read-Host "Enter name of OU"
            $OUpath = ([adsisearcher]"(&(objectCategory=organizationalUnit)(ou=*$Ouname*))").findall().properties.distinguishedname | Out-GridView -PassThru -Title "Select OU" -ErrorAction Stop 
           }

           $LDAPPath = "LDAP://$DomainDNSName"
           $Searcher = [adsisearcher]"(|(&(objectCategory=computer)(!(userAccountControl:1.2.840.113556.1.4.803:=8192)))(objectCategory=User)(groupType:1.2.840.113556.1.4.803:=2)(objectCategory=organizationalUnit))"
           $Searcher.SearchRoot = [ADSI]$LDAPPath
           $conditions = $Searcher.FindAll().Properties
        }
        if ($null -eq $conditions)
        {
            throw "Aucun element trouve"
        }


        #region Selection du nouveau Owner pour les objects AD 
        
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

        #region Scan AD Object 

            $conditions | ForEach-Object {

                $name = $_.samaccountname
                if (!$name) { 
                    $name = $_.name 
                }

                Log "Script" "We scanne $name" 3 Yellow 
            

                $getowner = [ADSI]("LDAP://" + $_.distinguishedname)
                $CurrentOwner = $getowner.PsBase.ObjectSecurity.Owner.Split("\")[1]
                Log "Script"  "  Owner = $CurrentOwner" 3 gray 
        
                #check if owner is different from the array
                if ($skipdefaultgroups -notcontains $CurrentOwner -or ($RepairAll.IsPresent -eq $true -and $groupecorrect.Name -ne $CurrentOwner)) 
                { 
                    #Convert Binary SID     
                    $sid = $_["objectsid"][0] 
                    $sidstring = ""
                    if ($sid) { 
                        $sidstring = (New-Object System.Security.Principal.SecurityIdentifier($sid, 0)).Value 
                    }

                    if ($_["objectcategory"][0] -match "Computer") {
                        $newowner = Repair-BrokenOwner $getowner 
                        Add-TableItem Computer $_["name"][0] $_["samaccountname"][0] $_["distinguishedname"][0] $_["whencreated"][0] $sidstring $_["operatingsystem"][0] $CurrentOwner $newowner OS brokenpc  
                    }
                    elseif ($_["objectcategory"][0] -match "Person") {
                        $newowner = Repair-BrokenOwner $getowner
                        Add-TableItem Users $_["name"][0] $_["samaccountname"][0] $_["distinguishedname"][0] $_["whencreated"][0] $sidstring $_["userprincipalname"][0] $CurrentOwner $newowner UPN brokenusers
                    }         
                    elseif ($_["objectcategory"][0] -match "Group-Policy-Container") {
                
                        $newowner = Repair-BrokenOwner $getowner
                        Add-TableItem GPO $_["displayname"][0] ' ' $_["distinguishedname"][0] $_["whencreated"][0] " " $_["whenchanged"][0]  $CurrentOwner $newowner whenchanged brokenGPO
                    } 
                    elseif ($_["objectcategory"][0] -match "group") {
                        $newowner = Repair-BrokenOwner $getowner
                        Add-TableItem Groups $_["name"][0] $_["samaccountname"][0] $_["distinguishedname"][0] $_["whencreated"][0] $sidstring $_["cn"][0]  $CurrentOwner $newowner CN brokengroups
                    }
                    else {
                        $newowner = Repair-BrokenOwner $getowner
                        Add-TableItem OU $_["name"][0] ' ' $_["distinguishedname"][0] $_["whencreated"][0] ' ' $_["description"][0]  $CurrentOwner $newowner Description brokenou
                    } 
                    $name = $getowner = $null 
                }
                $script:nbrscanobject++
            }

        #endregion

        #region CreateHTML
            $html = $null
            $htmlResultBody = $null

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
                        table.RepportUser {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
        
                        .RepportUser th, .RepportUser td {
                            padding: 10px;
                            border-bottom: 1px solid #ddd;
                            text-align: left;
                        }
        
                        .RepportUser th {
                            background-color: #8b0b4d;
                            color: #fff;
                            text-align: center ;
                        }
                        caption {
                            background-color:#FFFF66;
                            text-align:left;
                            font-weight:bold;
                            font-size:14pt;
                        }
                        #tr:nth-child(n + 50) {    visibility: hidden;}
                    </style>
"@

           
            # Generate HTML page style
            $htmlResultBody += "<div style='float: right; font-size: 35px; border: solid 1px red; margin-top: 25px;'>Domain: <b>$DomainDNSName</b></div>"
            $htmlResultBody += "<h3>Repair-WBADObjectsOwner</h3>"
            $htmlResultBody += "<h3>$($global:Date_Logs_File) / Scanned Object: $($script:nbrscanobject)</h3>"

            # Convert broken objects to HTML fragments
            $brokenUsersHtml  = $script:brokenusers | ConvertTo-Html -Fragment -PreContent "<h1>Broken Users: $nbrbrokenusers</h1>"
            $brokenPCHtml     = $script:brokenpc | ConvertTo-Html -Fragment -PreContent "<h1>Broken PC: $NbrsbrokenPC</h1>"
            $brokenGroupsHtml = $script:brokengroups | ConvertTo-Html -Fragment -PreContent "<h1>Broken Groups: $nbrbrokengroups</h1>"
            $brokenOUHtml     = $script:brokenou | ConvertTo-Html -Fragment -PreContent "<h1>Broken OU: $nbrbrokenou</h1>"
            $brokenGPOHtml    = $script:brokenGPO | ConvertTo-Html -Fragment -PreContent "<h1>Broken GPO: $nbrbrokenGPO</h1>"

            # Combine HTML fragments
            $htmlResultBody +=  if ($script:nbrbrokenusers -gt 0){$brokenUsersHtml}
            $htmlResultBody +=  if ($script:NbrsbrokenPC -gt 0){$brokenPCHtml}
            $htmlResultBody +=  if ($script:nbrbrokengroups -gt 0){$brokenGroupsHtml}
            $htmlResultBody +=  if ($script:nbrbrokenou -gt 0){$brokenOUHtml}
            $htmlResultBody +=  if ($script:nbrbrokenGPO -gt 0){$brokenGPOHtml}
            

            # Convert to complete HTML
            $html = ConvertTo-Html -Body $htmlResultBody -Head $head

            # Apply styling to specific table cells
            $html = $html -replace "<td>Error -", "<td style='background-color: red;'>Error -"
            $html = $html -replace "<td>Insuficient", "<td style='background-color: Yellow;'>Insufficient"
            $html = $html -replace "<td>Not", "<td style='background-color: Aqua;'>Not"
            $html = $html -replace "<table>", "<table class='RepportUser'>"
        #endregion

        #region Sending an email if disabled users without account deactivation information are found
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ($script:nbrbrokenusers -gt 0 -or $script:NbrsbrokenPC -gt 0 -or $script:nbrbrokengroups -gt 0 -or $script:nbrbrokenou -gt 0 -or $script:nbrbrokenGPO -gt 0 ) 
        {
            $html  | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_report-brokenowner.html" -Encoding utf8 -Force
            $tableHTML =   if ($script:nbrbrokenusers -gt 0){$brokenUsersHtml}
            $tableHTML +=  if ($script:NbrsbrokenPC -gt 0){$brokenPCHtml}
            $tableHTML +=  if ($script:nbrbrokengroups -gt 0){$brokenGroupsHtml}
            $tableHTML +=  if ($script:nbrbrokenou -gt 0){$brokenOUHtml}
            $tableHTML +=  if ($script:nbrbrokenGPO -gt 0){$brokenGPOHtml}
            # $HTML peut etre en pièce jointe !
            
            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
            }

            $TEXT_TITRE = "AD Objects found with wrong owner"
            $TEXT_INTRO  = "You can find in attachement modified AD Object."
            $TABLE_HTML  = $tableHTML -replace "<table>", "<table class='RepportUser'>" -replace "<td>Error -", "<td style='background-color: red;'>Error -" -replace "<td>Insuficient", "<td style='background-color: Yellow;'>Insufficient" -replace "<td>Not", "<td style='background-color: Aqua;'>Not"
      
 
            $TEXT_ACTION = ""
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_report-BrokOwnMail.html" -Encoding utf8 -Force
           
            Log "Script" "File generate - Some AD Object found with wrong owner. date`r`n`t $Path_Result$($Date_Logs_File)_$($DomainDNSName)_report-brokenowner.html" 1 Yellow  
            
            
        }else{
            Log "Script" "Aucune action effectuee. Tout les objets Active Directory ont les droits demandes." 1 Green
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
