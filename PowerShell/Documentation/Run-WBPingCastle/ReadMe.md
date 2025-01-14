# The *Run-WBPingCastle.ps1* PowerShell Script

The script automates the execution of the PingCastle tool to generate a health check report for Active Directory environments.
It validates prerequisites, manages script configurations, and sends the generated report via email to specified administrators.
Log files and generated reports are organized and maintained according to the configured retention policy.

# Syntax
```powershell
.\Run-WBPingCastle.ps1 [[-VerboseLvl] <Byte>] [[-Domain] <String>] [[-ResultPath] <String>] 
[<CommonParameters>]
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
     Specifies the target Active Directory domain for the health check. By default, the script uses the current domain of the system.
    
    Obligatoire :                         false
    Position :                            2
    Valeur par défaut                     (Get-ADDomain).DNSRoot
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```
```powershell
-ResultPath <String>
     Specifies the destination path to save the PingCastle report results. If not specified, the results are saved in the script directory.
    
    Obligatoire :                         false
    Position :                            3
    Valeur par défaut                     
    Accepter l entrée de pipeline :       false
    Accepter les caractères génériques :  false
```


# Related Links
- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Run-WBPingCastle/ReadMe.md

- https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Run-WBPingCastle/Run-WBPingCastle.ps1
# Prerequisite
- ## Modules
	- Ensure the **ModuleGenerics** module is installed. More information [How to install **ModuleGenerics**](/PowerShell/README.md)


- ## Parameters

This JSON file contains configurations for a script. It is structured into three sections: Generic, Tenant and Script. Find more explanation [here](/PowerShell/README.md)

# Example

1. Example
```powershell
PS> .\Run-WBPingCastle.ps1 -VerboseLvl 0



Executes the script in silent mode in current domain, logging actions without displaying them in the console.



PS>  .\Run-WBPingCastle.ps1 -VerboseLvl 2 -Domain OtherDomain.tld

Runs the script with detailed logging on domain 'OtherDomain.tld'.



PS>  .\Run-WBPingCastle.ps1 -ResultPath "C:\PingCastleResult"

Runs the script and save PingCastle repport in specified directory
```

