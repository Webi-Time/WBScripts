# The *Repair-WBADSysvolFilesOwner.ps1* PowerShell Script

The script scans files and folders in the SYSVOL directory of an Active Directory domain, checking if the ownership is correct. 
If any file or folder has an incorrect owner (based on group membership), the script repairs the owner to the correct group. 
It supports both automatic and manual owner selection, as well as generating an HTML report detailing the status of each file/folder.

# Syntax
```powershell
.\Repair-WBADSysvolFilesOwner.ps1 [[-VerboseLvl] <Byte>] [[-Domain] <String>] [[-GPOwner] 
<String>] [[-rootPath]] [[-ShowNotBroken]] [[-Repair]] [[-RepairAll]] [[-ResultPath] <String>] [<CommonParameters>]
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
-ShowNotBroken [<SwitchParameter>]
     Specifies whether to include files/folders that are already correctly owned in the report.
        - $true: Include not broken files/folders.
        - $false: Exclude not broken files/folders from the report.
    
    Obligatoire :                         false
    Position :                            5
    Valeur par défaut                     False
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
     If specified, the script will attempt to repair all files and folders their ownership is not equal to desired owner. This includes both broken and correctly owned 
    files.
    
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
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Repair-WBADSysvolFilesOwner/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Repair-WBADSysvolFilesOwner/Repair-WBADSysvolFilesOwner.ps1
# Prerequisite
- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/README.md)


- ## Parameters

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/README.md)

# Example

1. Example
```powershell
PS> .\Repair-WBADSysvolFilesOwner.ps1 -VerboseLvl 0 -Repair



Executes the script in silent mode, attempts to repair broken ownership in SYSVOL, and saves the results in the default path.



PS>  .\Repair-WBADSysvolFilesOwner.ps1 -VerboseLvl 2 -Domain "otherDomain.local" -ShowNotBroken 

Scans SYSVOL on the specified domain 'otherDomain.local', includes not broken files in the report, and provides detailed logging.



PS>  .\Repair-WBADSysvolFilesOwner.ps1 -Repair -RepairAll -ResultPath "C:\Reports\SYSVOL_Report.html"

Attempts to repair all files and folders in SYSVOL, including those with correct ownership, and saves the report to the specified path.
```
