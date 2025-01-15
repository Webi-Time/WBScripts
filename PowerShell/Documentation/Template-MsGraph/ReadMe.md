# The *Template-MsGraph.ps1* PowerShell Script

This script description

# Syntax
```powershell
.\Template-MsGraph.ps1 [[-VerboseLvl] <Byte>] [<CommonParameters>]
```

This script supports the common parameters: Verbose, Debug, ErrorAction, ErrorVariable, WarningAction, 
WarningVariable, OutBuffer, PipelineVariable, and OutVariable.

# Parameters
```powershell
-VerboseLvl <Byte>
     Specifies the level of verbosity for logging. Logs are always written to a file, but console output varies:
    - `0`: No console output (silent mode). All output is logged to the file.
    - `1`: Minimal logging. Root level information and errors are displayed.
    - `2`: Basic logging. Displays basic information and errors. (DEFAULT)
    - `3`: Standard logging. Displays standard log messages, basic information, and errors.
    - `4`: Verbose logging. Displays detailed log messages, standard information, and errors.
    - `5`: Ultra verbose logging. Displays debug information, detailed log messages, standard information, and errors.
    
    Obligatoire :                         false
    Position :                            1
    Valeur par défaut                     2
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Template/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Template/Template.ps1
# Prerequisite
- ## Microsoft Graph API Permissions
	- The *Template-MsGraph.ps1* script requires an App Registration in Azure AD with specific permissions to interact with the Microsoft Graph API. The necessary permissions are as follows:

<p align='center'>
<img src='Template-MsGraph-Right.png' alt='Template-MsGraph permissions' width='auto' height='auto' />
</p>

- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/ReadMe-Modules-Installation.md)

	- The script uses function for download and upgrade Microsoft Graph Modules, but you can fix the module version with **$GraphModulesVrs** variable
<p align='center'>
<img src='/Datas/Images/FixMsGraphModuleVersion.png' alt='FixMsGraphModuleVersion' width='auto' height='auto' />
</p>

- ## Parameters
	- JSON File with tenant information
- Variable : description

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/ReadMe-JSON-File.md)

# Example

1. Example
```powershell
PS> .\script.ps1 -paramater
```

## Notes
Ensure the [ModuleGenerics] module is installed and that you have the necessary permissions to access Azure AD data.

>Author = 'AUBRIL Damien'

>Creation Date : 26/10/2023

>Version : 2.0

>Version Date : 05/09/2024

# Execution
<img src='Template-MsGraph-Execution.png' alt='Template-MsGraph-Execution' width='auto' height='auto' />

