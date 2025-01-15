# The *Add-CompagnyUsers.ps1* PowerShell Script

This automated script streamlines the process of creating users in an Active Directory environment. It reads information from 
a CSV file, creates user accounts with attributes such as full name, SAM account name, email address, temporary password, and more. 
It also handles adding users to groups if that information is provided in the CSV file.

# Syntax
```powershell
.\Add-CompagnyUsers.ps1 [[-VerboseLvl] <Byte>] [<CommonParameters>]
```

This script supports the common parameters: Verbose, Debug, ErrorAction, ErrorVariable, WarningAction, 
WarningVariable, OutBuffer, PipelineVariable, and OutVariable.

# Parameters
```powershell
-VerboseLvl <Byte>
     The verbosity level for logging information. It is set to 1 by default.
        - `0`: Minimal logging. Only critical errors are displayed.
        - `1`: Basic logging. Shows basic information and errors.
        - `2`: Standard logging. Displays standard log messages, basic information, and errors.
    
    Obligatoire :                         false
    Position :                            1
    Valeur par défaut                     1
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Add-CompagnyUsers/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Add-CompagnyUsers/Add-CompagnyUsers.ps1
# Prerequisite
- ## Microsoft Graph API Permissions
	- The *Add-CompagnyUsers.ps1* script requires an App Registration in Azure AD with specific permissions to interact with the Microsoft Graph API. The necessary permissions are as follows:

<p align='center'>
<img src='Add-CompagnyUsers-Right.png' alt='Add-CompagnyUsers permissions' width='auto' height='auto' />
</p>

- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/ReadMe-Modules-Installation.md)

	- The script use function for download and upgrade Microsoft Graph Modules, but you can fix the module version with **$GraphModulesVrs** variable
<p align='center'>
<img src='/Datas/Images/FixMsGraphModuleVersion.png' alt='FixMsGraphModuleVersion' width='auto' height='auto' />
</p>

- ## Parameters
	- CSVPath: The path to the CSV file containing user information. This file should follow a specific format with user attributes.

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/ReadMe-JSON-File.md)

# Example

1. Example
```powershell
PS> .\Add-CompanyUsers.ps1
```

2. Example
```powershell
PS> .\Add-CompanyUsers.ps1 -VerboseLvl 2
```

## Notes
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

>Author: Damien AUBRIL

>Creation Date: 26/10/2023

>Version: 1.0

# Execution
<img src='Add-CompagnyUsers-Execution.png' alt='Add-CompagnyUsers-Execution' width='auto' height='auto' />

