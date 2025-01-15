# The *Check-WBDisabledUsersTime.ps1* PowerShell Script

The script retrieves all disabled user accounts from Active Directory within the specified Organizational Unit (OU). It checks if the user has been 
disabled 
for a period longer than a specified threshold (defined by `$nbdayDelete`). 
    - Users disabled without any deactivation information are logged.
    - Users that have been disabled for more than the specified number of days are marked for deletion.
    - Reports are generated as HTML files detailing users to be deleted or those missing deactivation information.

# Syntax
```powershell
.\Check-WBDisabledUsersTime.ps1 [[-VerboseLvl] <Byte>] [[-Domain] <String>] [[-ResultPath] <String>] [<CommonParameters>]
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
```powershell
-Domain <String>
     Specifies the target Active Directory domain to use for the operation. By default, the script uses the current domain of the system.
    
    Obligatoire :                         false
    Position :                            2
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-ResultPath <String>
     The path where the result files will be stored.  If not specified, the results are saved in the script directory.
    
    Obligatoire :                         false
    Position :                            3
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Check-WBDisabledUsersTime/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Check-WBDisabledUsersTime/Check-WBDisabledUsersTime.ps1
# Prerequisite
- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/ReadMe-Modules-Installation.md)


- ## Parameters

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/ReadMe-JSON-File.md)

# Example

1. Example
```powershell
PS> .\Check-WBDisabledUsersTime.ps1 -VerboseLvl 0



Executes the script in silent mode in current domain, logging actions without displaying them in the console.



PS>  .\Check-WBDisabledUsersTime.ps1 -VerboseLvl 2 -Domain OtherDomain.tld

Runs the script with detailed logging on domain 'OtherDomain.tld'.
```

## Notes
Additional Notes:

Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.

>Author: Damien Aubril

>License: Not applicable

>Date: December 12, 2025


>Version: 1.0

Change Log :
- Update - 12/12/2024

# Execution
<img src='Check-WBDisabledUsersTime-Execution.png' alt='Check-WBDisabledUsersTime-Execution' width='auto' height='auto' />

