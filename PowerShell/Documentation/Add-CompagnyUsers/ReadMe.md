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
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/README.md)

	- The script use function for download and upgrade Microsoft Graph Modules, but you can fixe the module version with **$GraphModulesVrs** variable
<p align='center'>
<img src='/Datas/Images/FixMsGraphModuleVersion.png' alt='FixMsGraphModuleVersion' width='auto' height='auto' />
</p>

- ## Parameters
	- CSVPath: The path to the CSV file containing user information. This file should follow a specific format with user attributes.

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/README.md)

# Example

1. Example
```powershell
PS> .\Add-CompanyUsers.ps1
```

2. Example
```powershell
PS> .\Add-CompanyUsers.ps1 -VerboseLvl 2
```
# Execution
<img src='Add-CompagnyUsers-Execution.png' alt='Add-CompagnyUsers-Execution' width='auto' height='auto' />

