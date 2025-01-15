# The *Check-WBAADLastSynchronisation.ps1* PowerShell Script

This script checks the Azure Active Directory (Azure AD) synchronization status by comparing the last sync time with a specified threshold. 
If the sync is found to be out of date, an alert email is sent. The script also logs relevant information and errors to specific log files. 
It uses Microsoft Graph API and handles module loading, certificate validation, and email notifications in case of errors.

# Syntax
```powershell
.\Check-WBAADLastSynchronisation.ps1 [[-VerboseLvl] <Byte>] [<CommonParameters>]
```

This script supports the common parameters: Verbose, Debug, ErrorAction, ErrorVariable, WarningAction, 
WarningVariable, OutBuffer, PipelineVariable, and OutVariable.

# Parameters
```powershell
-VerboseLvl <Byte>
     Defines the level of verbosity in the script s output.
        - 0: No output to console.
        - 1: Displays errors only.
        - 2: Displays basic information and errors.
        - 3: Displays standard messages, basic information, and errors.
        - 4: Displays detailed messages, standard information, and errors.
        - 5: Displays debug information, detailed messages, standard information, and errors.
    
    Obligatoire :                         false
    Position :                            1
    Valeur par défaut                     2
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-WBAADLastSynchronisation/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-WBAADLastSynchronisation/Check-WBAADLastSynchronisation.ps1
# Prerequisite
- ## Microsoft Graph API Permissions
	- The *Check-WBAADLastSynchronisation.ps1* script requires an App Registration in Azure AD with specific permissions to interact with the Microsoft Graph API. The necessary permissions are as follows:

<p align='center'>
<img src='Check-WBAADLastSynchronisation-Right.png' alt='Check-WBAADLastSynchronisation permissions' width='auto' height='auto' />
</p>

- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/ReadMe-Modules-Installation.md)

	- The script use function for download and upgrade Microsoft Graph Modules, but you can fixe the module version with **$GraphModulesVrs** variable
<p align='center'>
<img src='/Datas/Images/FixMsGraphModuleVersion.png' alt='FixMsGraphModuleVersion' width='auto' height='auto' />
</p>

- ## Parameters
	- JSON File with tenant information
	- MaxMinutes : This parameter is set to "45" and indicates the maximum number of minutes without synchronization and e-mail alert.

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/ReadMe-JSON-File.md)

# Example

1. Example
```powershell
PS> .\Check-WBAADLastSynchronisation.ps1
```

2. Example
```powershell
PS> .\Check-WBAADLastSynchronisation.ps1 -VerboseLvl 0
```

## Notes
Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.

Ensure that the App Registration is granted the following permissions:
- Microsoft Graph -> Mail.send
- Microsoft Graph -> Organization.Read.All

>Author: Damien Aubril

>License: Not applicable

>Date: October 26, 2023


>Version: 1.0

Change Log :
- Update - 05/09/2024
- Update - 15/01/2025

# Execution
<img src='Check-WBAADLastSynchronisation-Execution.png' alt='Check-WBAADLastSynchronisation-Execution' width='auto' height='auto' />

