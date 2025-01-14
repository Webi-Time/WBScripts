<#
.SYNOPSIS
    Checks and disables user accounts in Active Directory based on criteria such as password expiration or inactivity.

.DESCRIPTION
    This script analyzes user accounts within an Active Directory domain using specific filters. 
    It identifies accounts with expired passwords or accounts that have been inactive for a defined period, then takes corrective actions, 
    including disabling the accounts and moving them to a specified organizational unit. 
    The results are documented in log files and reports to ensure clear tracking of the modifications made.

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

.PARAMETER PasswordCheck
    Enables checking for users whose passwords have expired and takes appropriate actions.

.PARAMETER InactiveCheck
    Enables checking for inactive users (based on last logon date) and takes appropriate actions.

.PARAMETER WhatIf
    Simulates the actions without making actual changes.

.PARAMETER ResultPath
    Specifies the directory where result files will be saved. Default is the script's "Results" folder.

.EXAMPLE
    PS> .\Disable-WBInactiveUsers.ps1 -VerboseLvl 0 -PasswordCheck
    Executes the script in silent mode in current domain, checks for users with expired passwords, displaying standard messages
    and performing actions (disabling users and moving them to a specified OU).

    PS> .\Disable-WBInactiveUsers.ps1 -VerboseLvl 2 -PasswordCheck -InactiveCheck -Domain "mydomain.com"
    This example checks for users with expired passwords and inactive accounts in the specified domain, displaying standard messages
    and performing actions (disabling users and moving them to a specified OU).

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Disable-WBInactiveUsers/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Disable-WBInactiveUsers/Disable-WBInactiveUsers.ps1

.NOTES
    Author: Damien Aubril
    License: Not applicable
    Version: 1.0
    Date: December 12, 2024

    Additional Notes:
    - Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.

    Change Log :
        Update - 12/12/2024
#>




[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 2,
    [Parameter(Mandatory = $false, Position = 1)][string]$Domain        = (Get-ADDomain).DNSRoot,
    [Parameter(Mandatory = $false, Position = 2)][switch]$PasswordCheck = $false,
    [Parameter(Mandatory = $false, Position = 3)][switch]$InactiveCheck = $false,
    [Parameter(Mandatory = $false, Position = 4)][switch]$WhatIf        = $false,
    [Parameter(Mandatory = $false, Position = 5)][string]$ResultPath = $null
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
        #endregion Script Variables

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
        #endregion Modules

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
                [string]$HTMLTemplatePath  = $Script_Param.TemplateHTMLPath

                [string]$FilterAccounts    = $Script_Param.FilterAccounts
                [string]$FilterOU          = $Script_Param.FilterOU
                [string]$DisableUserOUPath = $Script_Param.DisableUserOUPath

                [int]$DayBeforePwdExpired         = $Script_Param.DayBeforePwdExpired
                [string[]]$ExcludedAccounts = $Script_Param.ExcludedAccounts

                [int]$DayBeforeInactive = $Script_Param.DayBeforeInactive
                if ([string]::IsNullOrEmpty($DayBeforeInactive)){
                    $DayBeforeInactive = 180
                }

        #endregion JSON Config

        #region Variables Global

        #endregion Variables Global

        #region Script Functions

        #endregion Script Functions

        #region Initialisation

            # Calculate the space used by log and result folders and check if it's within the specified limit
            $SpaceUsed = Test-SpaceFolders ($global:Path_Logs,$Path_Result) $FilesToKeep $SpaceMax
            Log "Script" "$ScriptName - Use $SpaceUsed of $(WSize $SpaceMax) limit" 2 Cyan
        #endregion Initialisation
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
            # If FilterOU is empty or "*", we take the domain root DN
            if([string]::IsNullOrEmpty($FilterOU) -or $FilterOU -eq '*')
            {
                $FilterOU = $Dom.DistinguishedName
            }
        }
        catch 
        {
            Log "Script" "`tImpossible recuperer les informations du domaine" 1 Red
            Get-DebugError $_
            exit -1
        }
        #endregion
        #region Retrieving users in Active Directory
        Log "Script" "Getting Active Directory User objects" 1 Cyan
        [datetime]$DateToday = Get-Date
        [PSCustomObject[]]$UsersExpiredLimiteDisable  = $null
        [PSCustomObject[]]$UsersInactiveLimiteDisable = $null
        [PSCustomObject[]]$UsersDisableDone           = $null

        
    
        # Liste des utilisateurs Active Directory
  
        $AllADUsers = Get-ADUser -Filter * -SearchBase $FilterOU -Server $DomainDNSName -Properties Enabled,DisplayName,Name,GivenName,UserPrincipalName,EmailAddress,Comment,PasswordExpired,PasswordLastSet,PasswordNeverExpires,LastLogonDate,msDS-UserPasswordExpiryTimeComputed | `
        Where-Object {$_.SamAccountName -like "*$filterAccounts*" -and $_.SamAccountName -notlike "*$" -and $ExcludedAccounts -notcontains $_.SamAccountName }
        Log "Script" "Verify disable OU : $DisableUserOUPath" 2 Cyan
        try 
        {
            Get-ADOrganizationalUnit "$DisableUserOUPath" -Server $DomainDNSName -ErrorAction Stop | Out-Null
        }
        catch 
        {
            Log @("Script","Error") "Unable to find $DisableUserOUPath" 1 Red
            $Ouname = Read-Host "Enter name of OU"

            $LDAPPath = "LDAP://$DomainDNSName"
            $Searcher = [adsisearcher]"(&(objectCategory=organizationalUnit)(ou=*$Ouname*))"
            $Searcher.SearchRoot = [ADSI]$LDAPPath
            $DisableUserOUPath = $Searcher.FindAll().Properties.distinguishedname | Out-GridView -PassThru -Title "Select OU" -ErrorAction Stop 

            if ([string]::IsNullOrEmpty($DisableUserOUPath))
            {
                Log @("Script","Error") "Unable to find $DisableUserOUPath" 1 Red
                exit -1
            }
        }
        

        if ($AllADUsers.count -eq 0)
        {
            Log "Script" "`tNo user was found" 1 Red
            exit -1
        }
        Log "Script" "`tUsers found : [$($AllADUsers.count)]`t|  Disabled User found, [$(($AllADUsers| Where-Object {$_.Enabled -eq $false}).count)]" 1 DarkGreen
        #endregion
        
        
        # Traiter chaque utilisateur
        Foreach($User in $AllADUsers)
        {
            try{
                $UserPasswordDaysToExpiry =  ([datetime]::FromFileTime($User."msDS-UserPasswordExpiryTimeComputed")-$($DateToday)).days
            }catch{}

            try{
                $UserLastLogon = $null
                $UserLastLogon = ((get-date $User."LastLogonDate")-$($DateToday)).Days
            }catch{}
            
        
            
            # Si l'utilisateur est inactif
            if ($InactiveCheck.IsPresent -and ($UserLastLogon -lt -$DayBeforeInactive -and $User.Enabled))
            {
                Log "Script" "$($user.SamAccountName) - User inactive since $UserLastLogon days. Last login was $UserLastLogon days ago " 1 DarkYellow   
                Log "Script" "`tUser must be disabled" 1  Yellow 
                $UsersInactiveLimiteDisable += $User
            }
            # Si mot de passe a expire  
            if ($PasswordCheck.IsPresent -and ($UserPasswordDaysToExpiry -lt -$DayBeforePwdExpired -and $User.Enabled -and $User.PasswordNeverExpires -eq $False))
            {
                Log "Script" "$($user.SamAccountName) - User password expired since $UserPasswordDaysToExpiry." 1 DarkYellow
                Log "Script" "`tUser must be disabled" 1  Yellow 
                if ($UsersInactiveLimiteDisable -notcontains $User) 
                {
                    $UsersExpiredLimiteDisable += $User
                }
            }
        }

        Log "Script" "User to disable [$($UsersExpiredLimiteDisable.count)] has been found" 1 Green
        # Traitement des utilisateurs actifs qui ont leur mot de passe expiré dupuis plus de XX jours (action : a désactiver)
        foreach ($usr in $UsersExpiredLimiteDisable)
        {
                $causeDisable = "Password Expired"

                [datetime]$date = get-date
                $day = $date.Day ; $month = $date.month ; $years = $date.year
                $datetxt = "$day/$month/$years"        

                try 
                {
                    # Disable User
                    if (-not $WhatIf)
                    {
                        try 
                        {
                            # Ajoute le commentaire sur la date et la raison de la désactivation et le désactive
                            $usr | Set-ADUser -Replace @{comment = "DisabledDate:$datetxt;DisabledCause:$causeDisable;";} -Enabled $false -Server $DomainDNSName
                            Log "Script" "User [$($usr.SamAccountName)] has been disable" 1 Green
                            # Enleve la protection
                            Set-ADObject -Identity $usr -ProtectedFromAccidentalDeletion:$false -Server $DomainDNSName
                            # Déplace le compte désactivé
                            Move-ADObject -Identity $usr -TargetPath $DisableUserOUPath -Server $DomainDNSName

                            Log "Script" "User [$($usr.SamAccountName)] has been move on $DisableUserOUPath" 1 Green
                        }
                        catch 
                        {
                            Get-DebugError $_
                            $datetxt = $($_.Exception.Message)
                            $causeDisable  = "See Error folder Log for more info"
                        }
                    }
                    else 
                    {
                        Log "Script" "What-if specified - No Action on the user $(if($usr.UserPrincipalName){$usr.UserPrincipalName}else{$usr.SamAccountName})" 1 Gray
                        $datetxt = "Not disable : What-if specified"
                        $causeDisable  = $causeDisable + " : What-if specified"
                    }  
                    $UsersDisableDone += [PSCustomObject]@{
                        "Username"                 = $(if($usr.UserPrincipalName){$usr.UserPrincipalName}else{$usr.SamAccountName})
                        "Password Expiration Date" = Get-Date $([datetime]::FromFileTime($usr."msDS-UserPasswordExpiryTimeComputed")) -Format "dd/MM/yyyy"
                        "Password Last Changed"    = $(if($usr.PasswordLastSet){Get-Date $usr.PasswordLastSet -Format "dd/MM/yyyy" }else{"Never"})
                        "Last Login"               = $(if($usr.LastLogonDate){Get-Date $usr.LastLogonDate -Format "dd/MM/yyyy" }else{"Never"})
                        "Pwd expiré depuis"        = "$([Math]::Abs($([datetime]::FromFileTime($usr."msDS-UserPasswordExpiryTimeComputed")-$($DateToday)).days)) jours"
                        "Disabled Since"           = "$datetxt"
                        "Reason"                   = $causeDisable
                    }
                }
                catch 
                {
                    Get-DebugError $_
                }
        }
        Log "Script" "User to disable [$($UsersInactiveLimiteDisable.count)] has been found" 1 Green
        foreach ($usr in $UsersInactiveLimiteDisable)
        {
                $causeDisable = "Account Inactive"

                [datetime]$date = get-date
                $day = $date.Day ; $month = $date.month ; $years = $date.year
                $datetxt = "$day/$month/$years"
      
                try 
                {
                     # Disable User
                    if (-not $Whatif)
                    {
                        try 
                        {
                            # Ajoute le commentaire sur la date et la raison de la désactivation et le désactive
                            $usr | Set-ADUser -Replace @{comment = "DisabledDate:$datetxt;DisabledCause:$causeDisable;";} -Enabled $false -Server $DomainDNSName
                            # Enleve la protection
                            Set-ADObject -Identity $usr -ProtectedFromAccidentalDeletion:$false -Server $DomainDNSName
                            # Déplace le compte désactivé
                            Move-ADObject -Identity $usr -TargetPath $DisableUserOUPath -Server $DomainDNSName

                            Log "Script" "User [$($usr.SamAccountName)] has been disable and move on $DisableUserOUPath" 1 Green
                        }
                        catch 
                        {
                            Get-DebugError $_
                            $datetxt = $($_.Exception.Message)
                            $causeDisable  = "See Error folder Log for more info"
                        }
                    }
                    else 
                    {
                        Log "Script" "What-if specified - No Action on the user $(if($usr.UserPrincipalName){$usr.UserPrincipalName}else{$usr.SamAccountName})" 1 Gray
                        $datetxt = "Not disable : What-if specified"
                        $causeDisable  = $causeDisable + " : What-if specified"
                    }   

                    $UsersDisableDone += [PSCustomObject]@{
                        "Username"              = $(if($usr.UserPrincipalName){$usr.UserPrincipalName}else{$usr.SamAccountName})
                        "Password Last Changed" = $(if($usr.PasswordLastSet){Get-Date $usr.PasswordLastSet -Format "dd/MM/yyyy" }else{"Never"})
                        "Last Login"            = $(if($usr.LastLogonDate){Get-Date $usr.LastLogonDate -Format "dd/MM/yyyy" }else{"Never"})
                        "Disabled Since"        = "$datetxt"
                        "Reason"                = $causeDisable
                    }               
                }
                catch 
                {
                    Get-DebugError $_
                }
        }

      

        #region Sending an email if users have just been disabled
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ($null -ne $UsersDisableDone ) 
        {
            try 
            {
                [string]$HTMLBody = Get-Content "$Path_Root\$HTMLTemplatePath" -Raw
            }
            catch 
            {
                Get-DebugError $_
            }

            $TEXT_TITRE = "Disabled account notification"
            $TEXT_INTRO  = "The accounts below have just been disabled."
            $TABLE_HTML  = $($UsersDisableDone | Select-Object * | ConvertTo-Html -Fragment -As Table) -replace "<table>","<table class='RepportUser'>"
            $TEXT_ACTION = "No action required - Setting for disable account <b>[Last Logon Date > $DayBeforeInactive]</b> OR <b>[Password Expired > $DayBeforePwdExpired]</b>"
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_UsersDisable.html" -Encoding utf8 -Force
        
            Log "Script" "File generate - Some Users have just been disabled. `r`n`t [$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_UsersDisable.html]" 1 Yellow      
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





