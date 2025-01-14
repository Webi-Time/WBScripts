# The *Start-ConnectTenant.ps1* PowerShell Script

This PowerShell script establishes a connection to a Microsoft Graph API tenant using specified credentials. It then 
provides a menu-driven interface for administrators to interact with the tenant, enabling actions such as displaying 
authorized scopes, SKU information, user details, and more.

# Syntax
```powershell
.\Start-ConnectTenant.ps1 [[-VerboseLvl] <Byte>] [-LogOff] [<CommonParameters>]
```

This script supports the common parameters: Verbose, Debug, ErrorAction, ErrorVariable, WarningAction, 
WarningVariable, OutBuffer, PipelineVariable, and OutVariable.

# Parameters
```powershell
-VerboseLvl <Byte>
     Verbosity level for logging information. By default, it is set to 1.
        - `0`: Minimal logging. Only critical errors are displayed.
        - `1`: Basic logging. Displays basic information and errors.
        - `2`: Standard logging. Displays standard log messages, basic information, and errors.
        - `3`: Verbose logging. Displays detailed log messages, standard information, and errors.
    
    Obligatoire :                         false
    Position :                            1
    Valeur par défaut                     2
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-LogOff [<SwitchParameter>]
     A switch parameter that, when specified, allows for a graceful disconnection from the Microsoft Graph tenant. It ends 
    the session without executing further actions. By default, it is set to $false.
    
    Obligatoire :                         false
    Position :                            named
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Start-ConnectTenant/ReadMe.md
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Start-ConnectTenant/Start-ConnectTenant.ps1
# Prerequisite
- ## Microsoft Graph API Permissions
	- The *Start-ConnectTenant.ps1* script requires an App Registration in Azure AD with specific permissions to interact with the Microsoft Graph API. The necessary permissions are as follows:

<p align='center'>
<img src='Start-ConnectTenant-Right.png' alt='Start-ConnectTenant permissions' width='auto' height='auto' />
</p>

- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/README.md)

	- The script use function for download and upgrade Microsoft Graph Modules, but you can fixe the module version with **$GraphModulesVrs** variable
<p align='center'>
<img src='/Datas/Images/FixMsGraphModuleVersion.png' alt='FixMsGraphModuleVersion' width='auto' height='auto' />
</p>

- ## Parameters
	None.

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/README.md)

# Example

1. Example
```powershell
PS> .\Start-ConnectTenant.ps1 -VerboseLvl 0
```
# Execution
<img src='Start-ConnectTenant-Execution.png' alt='Start-ConnectTenant-Execution' width='auto' height='auto' />

