<#
.SYNOPSIS
    This script checks disabled users in Active Directory, including users with missing deactivation information. 
    It generates HTML reports and handles the deletion of users disabled for a certain period.

.DESCRIPTION
    The script retrieves all disabled user accounts from Active Directory within the specified Organizational Unit (OU). It checks if the user has been disabled 
    for a period longer than a specified threshold (defined by `$nbdayDelete`). 
        - Users disabled without any deactivation information are logged.
        - Users that have been disabled for more than the specified number of days are marked for deletion.
        - Reports are generated as HTML files detailing users to be deleted or those missing deactivation information.

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

.PARAMETER ResultPath
    The path where the result files will be stored.  If not specified, the results are saved in the script directory.

.EXAMPLE
    PS> .\Check-WBDisabledUsersTime.ps1 -VerboseLvl 0
    Executes the script in silent mode in current domain, logging actions without displaying them in the console.

    PS> .\Check-WBDisabledUsersTime.ps1 -VerboseLvl 2 -Domain OtherDomain.tld
    Runs the script with detailed logging on domain 'OtherDomain.tld'.

.OUTPUTS
    The script generates:
    - HTML reports for Disabled users who need to be deleted because they have been inactive for a period longer than the specified threshold.
    - HTML reports for Disabled users without deactivation information (Missing "DisabledDate" or "DisabledCause" in the "Comment" field).
    - Logs stored in the configured Logs directory.
.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-WBDisabledUsersTime/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-WBDisabledUsersTime/Check-WBDisabledUsersTime.ps1


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
                
                [string]$FilterAccounts = $Script_Param.FilterAccounts
                [string]$FilterOU       = $Script_Param.FilterOU
        
                [int]$nbdayDelete           = $Script_Param.DayBeforeDelete
                [string[]]$ExcludedAccounts = $Script_Param.ExcludedAccounts
        #endregion JSON Config

        #region Variables Global
        
        #endregion Variables

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
        }
        catch 
        {
            Log "Script" "`tImpossible recuperer les informations du domaine" 1 Red
            Get-DebugError $_
            exit -1
        }
        #endregion
       
        #region Retrieving disabled users in Active Directory
        Log "Script" "Getting Active Directory Disabled User objects" 1 Cyan
        [PSCustomObject[]]$UsersToDelete              = $null
        [PSCustomObject[]]$UserDisableWithoutInfo     = $null

        # If FilterOU is empty or "*", we take the domain root DN
        if([string]::IsNullOrEmpty($FilterOU) -or $FilterOU -eq '*')
        {
            $FilterOU = (Get-ADDomain -Server $DomainDNSName).DistinguishedName
        }

        # Retrieving disabled users in Active Directory
        $DisabledUsers = Get-ADUser -Filter {(Enabled -eq $False)} -SearchBase $FilterOU -Server $DomainDNSName -Properties Enabled,DisplayName,Name,GivenName,UserPrincipalName,EmailAddress,Comment,PasswordExpired,PasswordLastSet,PasswordNeverExpires,LastLogonDate,msDS-UserPasswordExpiryTimeComputed | `
                        Where-Object {$_.SamAccountName -like "*$filterAccounts*" -and $ExcludedAccounts -notcontains $_.SamAccountName }
        
        
        if ($DisabledUsers.count -eq 0)
        {
            Log "Script" "`tNo user was found" 1 Red
            exit -1
        }
        Log "Script" "`tDisabled User found, $($DisabledUsers.count) items" 1 DarkGreen
        #endregion
        

        #region Sorting disabled users based on the user's "Comment" attribute (User disable without information | Users disable since)
        foreach ($User in $DisabledUsers)
        {
                [datetime]$date = get-date 
                $day = $date.Day ; $month = $date.month ; $years = $date.year
                $nameUser = $(if($User.UserPrincipalName){$User.UserPrincipalName}else{$User.SamAccountName})
                # If the user has been disabled with a comment
                if (-not [string]::IsNullOrEmpty($User.Comment))
                {            
                    $com = $User.comment -split ";"

                    $DisableDate = (($com | Where-Object {$_ -like "DisabledDate*"}) -split ":")[1].trim()
                    $DisableCause = (($com | Where-Object {$_ -like "DisabledCause*"}) -split ":")[1]
                    
                    
                    $day = ($DisableDate -split "/")[0]
                    $month = ($DisableDate -split "/")[1]
                    $years =( $DisableDate -split "/")[2]
                    $DisableDateMUL = get-date -Day $day -Month $month -Year $years            
                    $UserDisableDateDay =  ((get-date $DisableDateMUL)-$(Get-date)).days

                    #  If the user has been disabled for more than XX days - Add to the list of users to delete
                    if ($UserDisableDateDay -lt -$nbdayDelete) 
                    {
                        Log "Script" "$nameUser - User Disabled since $UserDisableDateDay day - More than $nbdayDelete" 1 Red 
                        try {
                            $UsersToDelete += [PSCustomObject]@{
                                "Username"                 = $nameUser   
                                "Password Expiration Date" = $(if($User."msDS-UserPasswordExpiryTimeComputed"){ Get-Date $([datetime]::FromFileTime($User."msDS-UserPasswordExpiryTimeComputed")) -Format "dd/MM/yyyy" }else{"NA"})
                                "Password Last Changed"    = $(if($User.PasswordLastSet){Get-Date $User.PasswordLastSet -Format "dd/MM/yyyy" }else{"Never"})
                                "Last Login"               = $(if($User.LastLogonDate){Get-Date $User.LastLogonDate -Format "dd/MM/yyyy" }else{"Never"})
                                "Disabled Since"           = "$DisableDate - ($([Math]::Abs($UserDisableDateDay)) jours)"
                                "Reason"                   = $DisableCause
                            } 
                        }
                        catch {
                            $UsersToDelete += [PSCustomObject]@{
                                "Username"                 = $nameUser   
                                "Password Expiration Date" = "Error"
                                "Password Last Changed"    = "Error"
                                "Last Login"               = "Error"
                                "Disabled Since"           = "$DisableDate - ($([Math]::Abs($UserDisableDateDay)) jours)"
                                "Reason"                   = $DisableCause
                            } 
                        }
                           
                        
                    }
                    # If the user has been disabled for less than XX days - Keep the user
                    else 
                    {
                        Log "Script" "$nameUser - User Disabled since $UserDisableDateDay day - Less than $nbdayDelete" 3 Green
                    }
                }
                # Otherwise, the user has been disabled without any comment
                else
                {
                    Log "Script" "$nameUser - No information on the account deactivation" 2 Magenta
                    
                    try {
                        $UserDisableWithoutInfo += [PSCustomObject]@{
                            "Username"                 = $nameUser   
                            "Password Expiration Date" = $(if($User."msDS-UserPasswordExpiryTimeComputed"){ Get-Date $([datetime]::FromFileTime($User."msDS-UserPasswordExpiryTimeComputed")) -Format "dd/MM/yyyy" }else{"NA"})
                            "Password Last Changed"    = $(if($User.PasswordLastSet){Get-Date $User.PasswordLastSet -Format "dd/MM/yyyy" }else{"Never"})
                            "Last Login"               = $(if($User.LastLogonDate){Get-Date $User.LastLogonDate -Format "dd/MM/yyyy" }else{"Never"})
                            "Disabled Since"           = "Aucune Information"
                            "Reason"                   = "Aucune Information"
                        } 
                    }
                    catch {
                        $UsersToDelete += [PSCustomObject]@{
                            "Username"                 = $nameUser   
                            "Password Expiration Date" = "Error"
                            "Password Last Changed"    = "Error"
                            "Last Login"               = "Error"
                            "Disabled Since"           = "Aucune Information"
                            "Reason"                   = "Aucune Information"
                        } 
                    }
                }
        }
        #endregion

        #region Sending an email if disabled users need to be deleted are found
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ($null -ne $UsersToDelete) 
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
            $TEXT_INTRO  = "The accounts below must be deleted from AD. They have been disabled for more than $nbdayDelete days."
            $TEXT_ACTION = "Make sure to delete these users as soon as possible."
            $TABLE_HTML  = $($UsersToDelete | Select-Object * | ConvertTo-Html -Fragment -As Table) -replace "<table>", "<table class='RepportUser'>"
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 
        
            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_DisableUsers_ToDelete.html" -Encoding utf8 -Force
            Log "Script" "File generate - Some disabled Users need te be delete.`r`n`t [$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_DisableUsers_ToDelete.html]" 1 Yellow
        }
        #endregion 

        #region Sending an email if disabled users without account deactivation information are found
        # Currently without email sending, please refer to the documentation on how to add email sending
        if ($null -ne $UserDisableWithoutInfo ) 
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
            $TEXT_INTRO  = "The accounts below have no information on account deactivation."
            $TABLE_HTML  = ($UserDisableWithoutInfo | Select-Object * | ConvertTo-Html -Fragment -As Table) -replace "<table>", "<table class='RepportUser'>"
            $TEXT_ACTION = "Please provide a date and a reason (Attribute <i>Comment</i> - Example: <b>DisabledDate : [DateDuJour];DisabledCause : Unknown;</b>)."
            [string]$bodyAdmin = $HTMLBody  -replace "!--TEXT_TITRE--!",$TEXT_TITRE -replace "!--TEXT_INTRO--!",$TEXT_INTRO `
                                            -replace "!--TABLE_HTML--!",$TABLE_HTML -replace "!--TEXT_ACTION--!", $TEXT_ACTION 

            $bodyAdmin | Out-File "$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_DisableUsers_WithoutDate.html" -Encoding utf8 -Force
            Log "Script" "File generate - Some disabled Users don't have Disable date`r`n`t [$Path_Result\$($Date_Logs_File)_$($DomainDNSName)_DisableUsers_WithoutDate.html]" 1 Yellow      
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
