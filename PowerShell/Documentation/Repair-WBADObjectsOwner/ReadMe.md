﻿# The *Repair-WBADObjectsOwner.ps1* PowerShell Script

This script helps detect the owners of objects that are not "standard" and may represent a risk 
(users, computers, groups, GPOs and organizational units).

It generates an HTML page, and a CSV if the parameter has been specified.

# Syntax
```powershell
.\Repair-WBADObjectsOwner.ps1 [[-VerboseLvl] <Byte>] [[-Domain] <String>] [[-GPOwner] <String>] [[-rootPath]] [[-OUPath] <String>] [[-Repair]] [[-RepairAll]] [[-ResultPath] <String>] [<CommonParameters>]
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
    Valeur par défaut                     3
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
-GPOwner <String>
     Specifies the new owner for the SYSVOL files and folders. If not provided, the user will be prompted to select the owner manually.
    
    Obligatoire :                         false
    Position :                            3
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-rootPath [<SwitchParameter>]
     Indicates whether to scan the root of the SYSVOL directory. If specified, the script will process the root path as well as any subdirectories.
    
    Obligatoire :                         false
    Position :                            4
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-OUPath <String>
     
    Obligatoire :                         false
    Position :                            5
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-Repair [<SwitchParameter>]
     Indicates whether to attempt to repair broken owner information. If specified, the script will attempt to fix ownership issues.
        - $true: Attempt to repair broken ownership.
        - $false: Only analyze without making changes.
    
    Obligatoire :                         false
    Position :                            6
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-RepairAll [<SwitchParameter>]
     If specified, the script will attempt to repair all AD Object their ownership is not equal to desired owner. This includes both broken and 
    correctly owned files.
    
    Obligatoire :                         false
    Position :                            7
    Valeur par défaut                     False
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-ResultPath <String>
     The path where the result files will be stored.  If not specified, the results are saved in the script directory.
    
    Obligatoire :                         false
    Position :                            8
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Repair-WBADObjectsOwner/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Repair-WBADObjectsOwner/Repair-WBADObjectsOwner.ps1
# Prerequisite
- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/ReadMe-Modules-Installation.md)


- ## Parameters

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/ReadMe-JSON-File.md)

# Example

1. Example
```powershell
PS> .\Repair-WBADObjectsOwner.ps1 -VerboseLvl 0 -Repair



Executes the script in silent mode, attempts to repair broken ownership in SYSVOL, and saves the results in the default path.



PS>  .\Repair-WBADObjectsOwner.ps1 -VerboseLvl 2 -Domain "otherDomain.local" -ShowNotBroken 

Scans SYSVOL on the specified domain 'otherDomain.local', includes not broken files in the report, and provides detailed logging.



PS>  .\Repair-WBADObjectsOwner.ps1 -Repair -RepairAll -ResultPath "C:\Reports\SYSVOL_Report.html"

Attempts to repair all files and folders in SYSVOL, including those with correct ownership, and saves the report to the specified path.
```

## Notes
Additional Notes:

Ensure the required PowerShell modules (ModuleGenerics, ActiveDirectory) are installed and accessible.

>Author: Damien Aubril

>License: Not applicable

>Date: January 12, 2025


>Version: 1.0

Change Log :
- Update - 13/01/2024

# Execution
<img src='Repair-WBADObjectsOwner-Execution.png' alt='Repair-WBADObjectsOwner-Execution' width='auto' height='auto' />

