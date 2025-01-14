# The *Disable-WBInactiveUsers.ps1* PowerShell Script

This script analyzes user accounts within an Active Directory domain using specific filters. 
It identifies accounts with expired passwords or accounts that have been inactive for a defined period, then takes corrective actions, 
including disabling the accounts and moving them to a specified organizational unit. 
The results are documented in log files and reports to ensure clear tracking of the modifications made.

# Syntax
```powershell
.\Disable-WBInactiveUsers.ps1 [[-VerboseLvl] <Byte>] [[-Domain] <String>] [[-PasswordCheck]] 
[[-InactiveCheck]] [[-WhatIf]] [[-ResultPath] <String>] [<CommonParameters>]
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
    Valeur par défaut                     (Get-ADDomain).DNSRoot
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-PasswordCheck [<SwitchParameter>]
     Enables checking for users whose passwords have expired and takes appropriate actions.
    
    Obligatoire :                         false
    Position :                            3
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-InactiveCheck [<SwitchParameter>]
     Enables checking for inactive users (based on last logon date) and takes appropriate actions.
    
    Obligatoire :                         false
    Position :                            4
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-WhatIf [<SwitchParameter>]
     Simulates the actions without making actual changes.
    
    Obligatoire :                         false
    Position :                            5
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-ResultPath <String>
     Specifies the directory where result files will be saved. Default is the script s "Results" folder.
    
    Obligatoire :                         false
    Position :                            6
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Disable-WBInactiveUsers/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Disable-WBInactiveUsers/Disable-WBInactiveUsers.ps1
# Prerequisite
- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/Powershell/README.md)


- ## Parameters

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/Powershell/README.md)

# Example

1. Example
```powershell
PS> .\Disable-WBInactiveUsers.ps1 -VerboseLvl 0 -PasswordCheck



Executes the script in silent mode in current domain, checks for users with expired passwords, displaying standard messages

and performing actions (disabling users and moving them to a specified OU).



PS>  .\Disable-WBInactiveUsers.ps1 -VerboseLvl 2 -PasswordCheck -InactiveCheck -Domain "mydomain.com"

This example checks for users with expired passwords and inactive accounts in the specified domain, displaying standard messages

and performing actions (disabling users and moving them to a specified OU).
```
