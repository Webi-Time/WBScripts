<#
.SYNOPSIS
    This PowerShell script allows you to create users in Active Directory using a CSV file as a data source. It generates random 
    passwords for each user created and adds them to specified groups if provided.

.DESCRIPTION
    This automated script streamlines the process of creating users in an Active Directory environment. It reads information from 
    a CSV file, creates user accounts with attributes such as full name, SAM account name, email address, temporary password, and more. 
    It also handles adding users to groups if that information is provided in the CSV file.

.PARAMETER VerboseLvl
    The verbosity level for logging information. It is set to 1 by default.
        - `0`: Minimal logging. Only critical errors are displayed.
        - `1`: Basic logging. Shows basic information and errors.
        - `2`: Standard logging. Displays standard log messages, basic information, and errors.

.INPUTS
    - CSVPath: The path to the CSV file containing user information. This file should follow a specific format with user attributes.

.OUTPUTS
    This script generates logging information, including the status of user creation, and may send warnings if issues occur during 
    the process.

.EXAMPLE
PS> .\Add-CompanyUsers.ps1

.EXAMPLE
PS> .\Add-CompanyUsers.ps1 -VerboseLvl 2

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Add-CompagnyUsers/ReadMe.md
    
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Add-CompagnyUsers/Add-CompagnyUsers.ps1

.NOTES
    The "Add-CompanyUsers" script is designed to automate the creation of user accounts within an organization. It streamlines the 
    process of adding users to Active Directory, including configuring various attributes and group memberships, and it generates 
    temporary passwords for these users. The script helps administrators efficiently onboard new employees and manage user accounts.

    This PowerShell script performs the following tasks:
        1. Creates new user accounts in Active Directory with specified attributes, such as name, email address, job title, and department.
        2. Generates secure temporary passwords for the new user accounts to ensure initial access.
        3. Sets up the necessary environment and configuration, including loading required PowerShell modules.
        4. Retrieves user information from an input CSV file for account creation.
        5. Verifies the existence of specified organizational units (OUs) and assigns users to their respective OUs.
        6. Manages group memberships by adding users to specified groups, enhancing access control.
        7. Records user data, such as SamAccountName, UserPrincipalName, and email address, along with their temporary passwords.
        8. Provides flexibility by allowing administrators to exclude specific users from the account creation process.
        9. Logs information regarding script execution, including any errors and the runtime.
        
    Author: Damien AUBRIL
    Creation Date: 26/10/2023
    Version: 1.0
#>

[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false)]
    [ValidateSet(0, 1, 2, 3)]
    [byte]$VerboseLvl = 1
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
                #[string]$Path_Result = $null 
                [string]$Path_Result = $Path_Root + "\Results\"

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
                [PSCustomObject]$Script_Param =  $Params.Script

            # Get configuration values for files to keep and maximum space
                [int]$FilesToKeep = $Generic_Param.FilesToKeep
                [long]$SpaceMax = Invoke-Expression $($Generic_Param.SpaceToUseByScriptsMax)

             
            # Variables du script
              
                [string]$CSVPath = "$Path_Root" + $Script_Param.CSVPath

                $File_PassWord  = $Path_Result + "TmpPassword.txt"  # Chemin vers le fichier des mots de passe des utilisateurs créés
    
        #endregion

        #region Modules
            
            try{
                Write-Output "Loading Modules"
                Import-Module -Name ModuleGenerics -Force -ErrorAction Stop
                Import-Module -Name ActiveDirectory -Force -ErrorAction Stop
            }
            catch 
            {                
                Write-Output $_.Exception.Message
                exit 1
            }

        #endregion

        #region function
       
        
            function Get-RandomPassword 
            {
                param (
                    [Parameter(Mandatory)]
                    [ValidateRange(4,[int]::MaxValue)]
                    [int] $length,
                    [int] $upper = 1,
                    [int] $lower = 1,
                    [int] $numeric = 1,
                    [int] $special = 1
                )
                if($upper + $lower + $numeric + $special -gt $length) {
                    throw "number of upper/lower/numeric/special char must be lower or equal to length"
                }
                $uCharSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                $lCharSet = "abcdefghijklmnopqrstuvwxyz"
                $nCharSet = "0123456789"
                $sCharSet = "/*-+,!?=()@:._"
                $charSet = ""
                if($upper -gt 0) { $charSet += $uCharSet }
                if($lower -gt 0) { $charSet += $lCharSet }
                if($numeric -gt 0) { $charSet += $nCharSet }
                if($special -gt 0) { $charSet += $sCharSet }
        
                $charSet = $charSet.ToCharArray()
                $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
                $bytes = New-Object byte[]($length)
                $rng.GetBytes($bytes)
    
                $result = New-Object char[]($length)
                for ($i = 0 ; $i -lt $length ; $i++) {
                    $result[$i] = $charSet[$bytes[$i] % $charSet.Length]
                }
                $password = (-join $result)
                $valid = $true
                if($upper   -gt ($password.ToCharArray() | Where-Object {$_ -cin $uCharSet.ToCharArray() }).Count) { $valid = $false }
                if($lower   -gt ($password.ToCharArray() | Where-Object {$_ -cin $lCharSet.ToCharArray() }).Count) { $valid = $false }
                if($numeric -gt ($password.ToCharArray() | Where-Object {$_ -cin $nCharSet.ToCharArray() }).Count) { $valid = $false }
                if($special -gt ($password.ToCharArray() | Where-Object {$_ -cin $sCharSet.ToCharArray() }).Count) { $valid = $false }
    
                if(!$valid) {
                    $password = Get-RandomPassword $length $upper $lower $numeric $special
                }
                return $password
            }

            function Add-MembreGroup 
            {
            param (
                    [Parameter(Mandatory)][string] $UserSAM,
                    [Parameter(Mandatory)][string] $groups
                )
                [string[]]$lesgroup = $null

                $lesgroup = $groups.split(',')
                foreach ($grp in $lesgroup)
                {
                    try
                    {
                    Add-ADGroupMember -Identity $grp -Members $UserSAM
                    }
                    catch {
                        Log "Script" "Problem adding user [$UserSAM] to group [$grp]" 1 Red
                        Get-DebugError $_ 1 "`t- "
                    }
                }
            }
        
        #endregion

        
        #region Script Prerequisites

            if (Test-Path -Path $File_PassWord)
            { 
                Log "Script" "A password file already exists" 1 Yellow
            }
            else
            {
                New-Item -Path $File_PassWord -ItemType File -Force | Out-Null
                "Date;SamAccountName;UserPrincipalName;EmailAddress;TmpPassword" | Out-File $File_PassWord -Append -Encoding utf8
                Log "Script" "Creation of a file containing temporary user passwords" 1 Yellow
            }
            

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
        
        # Verification et Import du CSV
        try
        {
            if (Test-Path -Path "$CSVPath")
            { 
                Log "Script" "CSV - Path found" 2 Green
                $UsersCSV = Import-Csv -Path "$CSVPath" -Delimiter ';' -Encoding UTF8
                Log "Script" "CSV - The CSV file has been loaded" 1 Green
            }
            else 
            {
                Log "Script" "CSV - Path not correct, no CSV found at location $CSVPath" 1 Red            
                throw $_
            }        
        }
        catch 
        {
            Log "Script" "CSV - ERROR - Unable to load CSV : [$CSVPath]" 1 Red
            Get-DebugError $_ 1 "`t- "
            exit 1
        }


        foreach ($User in $UsersCSV)
        {
            $manager = $null
            if (-not [string]::IsNullOrEmpty($($User.Manager)) )
            {
                try
                {
                    $manager = Get-ADUser $($User.Manager)
                }
                catch
                {
                    Log "Script" "Warning - The specified manager does not exist in Active Directory : [$($User.Manager)]" 1 Yellow
                }
            }

            # Test si Name OK
            if ([string]::IsNullOrEmpty($($User.name)) )
            {
            Log "Script" "ERROR - The user cannot be created: The Name is mandatory to create the user: [$($User.DisplayName)]" 1 Red
            continue
            }

            # Test si Path OK et que l'OU existe
            if (-not [string]::IsNullOrEmpty($($User.Path)) )
            {
            if ([string]::IsNullOrEmpty($(Get-ADOrganizationalUnit -Filter "distinguishedName -eq '$($User.path)'"))){
                Log "Script" "ERROR - The user cannot be created: Path not found in Active Directory to create user : [$($User.DisplayName)] - [$($User.Path)]" 1 Red
                continue 
            }
            }
            else
            {
                Log "Script" "ERROR - The user cannot be created: The path is mandatory to create the user : [$($User.DisplayName)]" 1 Red
                continue 
            }

            # Test si utilisateur existe deja
            if (-not [string]::IsNullOrEmpty($(Get-ADUser -Filter "distinguishedName -eq '$($User.Name)'"))){
                Log "Script" "The user already exists: [$($User.DisplayName)]" 1 Green
                continue 
            }


            # Length 15, at least 3 upper case, 5 lower case, 3 number, 1 special
            $password = Get-RandomPassword 15 3 5 3 1
            try{
                if(([string]::IsNullOrEmpty($(Get-ADUser -filter "UserPrincipalName -eq '$($User.UserPrincipalName)'")))){
                    if ([string]::IsNullOrEmpty($($User.proxyAddresses)) )
                    {
                        New-ADUser `
                            -GivenName $($User.GivenName) -Surname $($User.Surname) -DisplayName $($User.DisplayName) -Name $($User.Name) `
                            -Description $($User.Description) -Office $($User.Office) -EmailAddress $($User.EmailAddress) `
                            -StreetAddress $($User.StreetAddress) -City $($User.City) -State $($User.State) -PostalCode $($User.PostalCode) -Country $($User.Country) `
                            -Company $($User.Company) -Department $($User.Department) -Manager $manager -Title $($User.Title) -MobilePhone $($User.MobilePhone) `
                            -SamAccountName $($User.SamAccountName) -UserPrincipalName $($User.UserPrincipalName) -AccountPassword $(ConvertTo-SecureString -String $password -AsPlainText -Force)`
                            -path $($User.path) -ChangePasswordAtLogon $False -Enabled $True
                    }else{
                        New-ADUser `
                            -GivenName $($User.GivenName) -Surname $($User.Surname) -DisplayName $($User.DisplayName) -Name $($User.Name) `
                            -Description $($User.Description) -Office $($User.Office) -EmailAddress $($User.EmailAddress) `
                            -OtherAttributes @{proxyaddresses=$($($User.proxyAddresses).Split(','))} `
                            -StreetAddress $($User.StreetAddress) -City $($User.City) -State $($User.State) -PostalCode $($User.PostalCode) -Country $($User.Country) `
                            -Company $($User.Company) -Department $($User.Department) -Manager $manager -Title $($User.Title) -MobilePhone $($User.MobilePhone) `
                            -SamAccountName $($User.SamAccountName) -UserPrincipalName $($User.UserPrincipalName) -AccountPassword $(ConvertTo-SecureString -String $password -AsPlainText -Force)`
                            -path $($User.path) -ChangePasswordAtLogon $False -Enabled $True
                    }
                    "$Date_Logs_File;$($User.SamAccountName);$($User.UserPrincipalName);$($User.EmailAddress);$password" | Out-File $File_PassWord -Append -Encoding utf8 -Force
                    Log "Script" "The user has been created - [$($User.DisplayName)]" 1 Green
                }else{
                    Log "Script" "The user already exists - [$($User.DisplayName)]" 1 Yellow
                }
            }catch{
                Log "Script" "Unable to create user : [$($User.DisplayName)]" 1 Red
                Get-DebugError $_ 1 "`t- "
                continue
            }

            # Add group 
            if (-not [string]::IsNullOrEmpty($($User.MemberOf)) )
            {
                try{
                    if ([string]::IsNullOrEmpty($($User.SamAccountName)))
                    {
                        Add-MembreGroup $($User.Name) $($User.MemberOf)
                    }
                    else
                    {
                        Add-MembreGroup $($User.SamAccountName) $($User.MemberOf)
                    }
                }catch{
                    Log "Script" "Unable to add user: [$($User.Name)] to group [$($User.MemberOf)]" 1 Red
                    Get-DebugError $_ 1 "`t- "
                    continue
                }
            }
        }
    }
    catch 
    {
        Get-DebugError $_
        exit 1
    }
}
End
{
    try{
       
        $Temps = ((Get-Date )-(Get-Date $StartScript)).ToString().Split('.')[0]
        Log "Script" "Running time : " 1 Cyan -NoNewLine ;  Log "Script" "[$($Temps.Split(':')[0])h$($Temps.Split(':')[1])m$($Temps.Split(':')[2])s]" 1 Red -NoDate
        Log "Script" "Script end : " 1 Cyan -NoNewLine ;  Log "Script" "[$($MyInvocation.MyCommand.Name)]" 1 Red -NoDate
    
        exit 0
    }
    catch {
        Get-DebugError $_
        exit 1
    }
}
