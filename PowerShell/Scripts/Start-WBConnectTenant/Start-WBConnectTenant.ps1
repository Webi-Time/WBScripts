<# 
.SYNOPSIS
    Connects to a Microsoft Graph API tenant and provides a menu-based interface to interact with the tenant, showing 
    available scopes, SKU information, user details, and more.

.DESCRIPTION
    This PowerShell script establishes a connection to a Microsoft Graph API tenant using specified credentials. It then 
    provides a menu-driven interface for administrators to interact with the tenant, enabling actions such as displaying 
    authorized scopes, SKU information, user details, and more.

.PARAMETER VerboseLvl
    Defines the level of verbosity in the script's output.
        - 0: No output to console.
        - 1: Displays errors only.
        - 2: Displays basic information and errors.
        - 3: Displays standard messages, basic information, and errors.
        - 4: Displays detailed messages, standard information, and errors.
        - 5: Displays debug information, detailed messages, standard information, and errors.

.PARAMETER LogOff
    A switch parameter that, when specified, allows for a graceful disconnection from the Microsoft Graph tenant and others. It ends 
    the session without executing further actions. By default, it is set to $false.

.INPUTS
    JSON File

.OUTPUTS
    This script generates logging information and provides an interactive menu for administrators to access tenant 
    information and execute Microsoft Graph API commands.

.EXAMPLE
    PS> .\Start-WBConnectTenant.ps1 

.LINK
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Documentation/Start-WBConnectTenant/ReadMe.md
    https://github.com/Webi-Time/WBScripts/blob/main/PowerShell/Scripts/Start-WBConnectTenant/Start-WBConnectTenant.ps1
    
.NOTES
    Additional Notes:
    
    Ensure the required PowerShell modules (ModuleGenerics) are installed and accessible.

    Ensure that the App Registration is granted the following permissions: 

        - Api use by my organisation -> Office 365 Exchange Online -> Application -> Exchange.ManageAsApp
            https://learn.microsoft.com/en-us/powershell/exchange/app-only-auth-powershell-v2?view=exchange-ps#select-and-assign-the-api-permissions-from-the-portal   
        - Api Microsoft Graph -> Microsoft Graph -> Delegated -> User.Read (at least for the connexion)
    
    For Exchange connection, ensure that you are a member of at least one of the following groups:
        
        - Compliance Administrator
        - Exchange Administrator
        - Exchange Recipient Administrator
        - Global Administrator
        - Global Reader
        - Helpdesk Administrator
        - Security Administrator
        - Security Reader	

    Author: Damien Aubril

    >License: Not applicable

    >Date: October 26, 2023
    
    Version: 1.0

    Change Log :
        - Update - 12/12/2024
#>

[cmdletbinding()]
Param
(
    [Parameter(Mandatory = $false, Position = 0)][ValidateSet(0, 1, 2, 3, 4, 5)][byte]$VerboseLvl = 2,
    [Parameter(Mandatory = $false, Position = 1)][switch]$LogOff = $false
)

Begin
{
    try
    {
        Clear-Host
        $StartScript = Get-Date
        if($VerboseLvl -ne 0){Write-host "$(Get-Date -f 'dd/MM/yyyy HH:mm:ss') - Script start : " -f Cyan -NoNewline; Write-host "[$($MyInvocation.MyCommand.Name)]" -f Red}
        $ErrorActionPreference = 'Stop'

        #region Script Variables

            # Get the script name without the .ps1 extension
                [string]$ScriptName = ($($MyInvocation.MyCommand.Name) -split ".ps1")[0]

            # Set the root path of the script
                [string]$Path_Root = $PSScriptRoot

            # Create the path for script log files
                [string]$global:Path_Logs = $Path_Root + "\Logs\"

            # Create the path for script result files
                [string]$Path_Result = $null #if([string]::IsNullOrEmpty($ResultPath)){$Path_Root + "\Results\"}else{$ResultPath}

            # Get the date in "yyyy-MM-dd-HH-mm-ss" format for log files
                [string]$global:Date_Logs_File = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
                $global:VerboseLvl             = $VerboseLvl
        #endregion

        #region Modules
            [string[]]$Global:AllMsGraphModule = (Find-Module "Microsoft.Graph*").Name | Where-Object {$_ -notlike "*beta*"}
            try
            {
                Import-Module -Name ModuleGenerics -Force -ErrorAction Stop
            }
            catch 
            {                
                Write-host "You must place the [ModuleGenerics] in one of the following appropriate folders before running the scripts : `n`r`t - $($env:USERPROFILE)\Documents\WindowsPowerShell\Modules`n`r`t - C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules" -f Red
                Write-host $_.Exception.Message
                exit -1
            }
            try
            {  
                Test-PackageProvider "NuGet"   

                $GraphModulesList =  "Authentication","Users","Groups","Sites","Mail","Calendar","Reports"
                $OthersModulesList = "ExchangeOnlineManagement"
                if(-not (Test-Modules ($GraphModulesList + $OthersModulesList)))
                {
                    
                    if ($PSVersionTable.PSVersion -like "7.*")
                    {
                        $GraphModulesVrs = $null
                        $vrsExOn =  "3.4.0"
                    }
                    else
                    {
                        $GraphModulesVrs = $null
                        $vrsExOn =  "3.4.0"
                        #The issue is that ExchangeOnlineManagement 3.5.1 uses version 8.0.23.53103 of System.Text.Json.dll where 3.4.x doesn't use 
                        #System.Text.Json.dll at all, hence there's no conflict with version 6.0.21.52210 used by the Microsoft.Graph.Authentication module.
                    } 
                    Install-GraphModuleInduviduals $GraphModulesList -DesiredVersion $GraphModulesVrs 
                    Import-GraphModuleInduviduals  $GraphModulesList -DesiredVersion $GraphModulesVrs 

                    Install-ModuleUserV2 "ExchangeOnlineManagement" -DesiredVersion $vrsExOn
                    Import-ModuleUserV2 "ExchangeOnlineManagement" -DesiredVersion $vrsExOn

                } 
                
            }
            catch 
            {                
                Get-DebugError $_
                exit 1
            }
        #endregion

        #region JSON Config

            # Path to JSON configuration files
                [string]$File_Config = $Path_Root + "\*.json"

            # Load JSON configuration from the file
                [PSCustomObject]$Params = Get-Content $File_Config -Raw | ConvertFrom-Json
                
                [PSCustomObject]$Generic_Param = $Params.Generic
                [PSCustomObject]$Tenant_Param  = $Params.Tenant
                [PSCustomObject]$Script_Param  = $Params.Script

            # Get configuration values for files to keep and maximum space
                [int]$FilesToKeep = $Generic_Param.FilesToKeep
                [long]$SpaceMax = Invoke-Expression $($Generic_Param.SpaceToUseByScriptsMax)

                [string]$clientId        = $Tenant_Param.clientId
                [string]$tenantId        = $Tenant_Param.tenantId
                [string]$CertThumbprint  = $Tenant_Param.clientCertificate
                [string]$tenantName      = $Tenant_Param.tenantName
             
            # Variables du script

                [boolean]$Script:ExchangeOnlineState = $false
                [boolean]$Script:MsGraphState = $false
        #endregion


        #region function
            function Show-Menu
            {
                $choice = "Start"
                While(($choice -ne 0 -and $choice -ne "" ) -or $choice -eq "Start" )
                {
                    Write-Host "############################# Menu #############################"   -ForegroundColor Cyan
                    Write-Host "# Connexion status : "                                              -F Cyan -NoNewline                   
                    if($Script:ExchangeOnlineState){Write-Host "Exchange Online" -F Green -NoNewline}else{Write-Host "Exchange Online" -F Red -NoNewline}
                    Write-Host " # "   -F Cyan -NoNewline
                    if($Script:MsGraphState){Write-Host "MsGraph API" -F Green}else{Write-Host "MsGraph API" -F Red }
                    Write-Host "# `t [0] - Disconnect"                                              -ForegroundColor Cyan
                    Write-Host "# `t [1] - Show allowed scopes"                                     -ForegroundColor Cyan
                    Write-Host "# `t [2] - Show SKU information"                                    -ForegroundColor Cyan
                    Write-Host "# `t [3] - Show SKU plans information"                              -ForegroundColor Cyan
                    Write-Host "# `t [4] - Show the first 15 users"                                 -ForegroundColor Cyan
                    Write-Host "# `t [5] - Show available [MsGraph] commands"                       -ForegroundColor Yellow
                    Write-Host "# `t [6] - Search [MsGraph] commands by keyword"                    -ForegroundColor Yellow                  
                    Write-Host "# `t [7] - Search permissions for a [MsGraph] command"              -ForegroundColor Yellow
                    Write-Host "# `t [8] - Show available [ExchangeOnline] commands"                -ForegroundColor Green
                    Write-Host "# `t [9] - Search [ExchangeOnline] commands by keyword "            -ForegroundColor Green 
                    Write-Host "# `t [] - Execute custom commands"                                  -ForegroundColor Cyan
                    
                    Write-Host "################################################################"   -ForegroundColor Cyan
                    $choice = Read-Host "Enter your choice"

                    Switch ($choice) 
                    {
                        "0" {
                            Disconnect-ExchangeOnline -Confirm:$false
                            Disconnect-MsGraphTenant
                            return $true
                        }
                        "1" {Get-AllowedScopes}
                        "2" {Get-Info}
                        "3" {Get-AvailableLicencePlan -filterPlan $(Read-Host "Licence :")}
                        "4" {Get-UsersInfo}                        
                        "5" {Get-CommandsGraph}
                        "6" {Get-CommandsGraph -filter (Read-Host "Search for a Graph command")}
                        "7" {Get-APIPermission -command (Read-Host "Search for command permissions")}
                        "8" {Get-CommandsExchOnline}
                        "9" {Get-CommandsExchOnline -filter (Read-Host "Search for a Exchange Online command")}
                        default {break}
                    }
                   
                }
                return $false
            } 
            function Show-MenuConnexion 
            {

                Write-Host ""
                Write-Host "[0] - Tout"
                Write-Host "[1] - Exchange Online"
                Write-Host "[2] - Graph"
                Write-Host ""
            
                $choice = Read-Host "Connection choice : " 
                Switch ($choice)
                {
                    0 {Connect-ExchOnline}
                    1 {Connect-ExchOnline}
                    2 {return $true}
                    default {
                        return $true
                    }
                }
                return $true
            }

            function Connect-ExchOnline
            {
                Log "Script" "Connecting Exchange Online Service ..." 2 Cyan
                try
                {        
                    Connect-ExchangeOnline -AppId $clientId -Organization $tenantName -CertificateThumbprint $CertThumbprint -ShowBanner:$false
                    Log "Script" "Connecting Exchange Online Service : Connected" 1 Green
                    $Script:ExchangeOnlineState = $true
                }
                catch
                {
                    Get-DebugError $_ 0
                    $Script:ExchangeOnlineState = $false
                    exit 1
                }
            }

            function Get-Info 
            {	
                ## Display available SKUs ##
                Log "Script" "Displaying available licenses" 1 Cyan
                try 
                {
                    $Licences = Get-MgSubscribedSku -Property SkuPartNumber, ConsumedUnits, PrepaidUnits,SkuId -ErrorAction Stop | Select-Object @{l='LicensesDisponible';e={$($_.PrepaidUnits.enabled)-$($_.ConsumedUnits)}},skupartnumber, ConsumedUnits, @{l='TotalLicenses';e={$_.PrepaidUnits.enabled}},@{l="Name";e={($ProductName -match $_.SkuId ).Product_Display_Name}}
                     Log "Script" "$($Licences | Select-Object * -Wait | Format-Table -AutoSize | Out-String)" 0 Yellow
                }
                catch 
                {
                    Log "Script" "Failed to retrieve license information." 0 Red
                    Get-DebugError $_ 0
                }
            }

            function Get-AvailableLicence 
            {
                param ($filter = "")
        
                $LicencesDisponible = Get-MgSubscribedSku -Property SkuPartNumber, ConsumedUnits, PrepaidUnits,SkuId -ErrorAction Stop | Where-Object {$_.skupartnumber -like "*$filter*"}   | Select-Object @{l='LicensesDisponible';e={$($_.PrepaidUnits.enabled)-$($_.ConsumedUnits)}},skupartnumber, ConsumedUnits, @{l='TotalLicenses';e={$_.PrepaidUnits.enabled}},@{l="Name";e={($ProductName -match $_.SkuId ).Product_Display_Name}},skuid
                return $LicencesDisponible
            }

            function Get-AvailableLicencePlan
            {
                param ($filterPlan = "",$filterLicence = "ENTERPRISE")
                [object[]]$Licen = (Get-AvailableLicence -filter $filterLicence )
                [PSCustomObject]$SPlan = $null
                foreach ($ID in $Licen) {
                    try {
                        $SPlan += (( Get-MgSubscribedSku -Property ServicePlans,SkuPartNumber, ConsumedUnits, PrepaidUnits,skuid -ErrorAction Stop | Where-Object {$_.SkuId -like "*$($ID.SkuID)*"} | Select-Object  ServicePlans).ServicePlans | Where-Object {$_.ServicePlanName -like "*$filterPlan*"}) | Select-Object ServicePlanId,@{l="Name";e=
                            {
                                $r = $CSV_FriendlyNameLicences -match $ID.SkuID ;
                                ($r -match $_.ServicePlanId ).Service_Plans_Included_Friendly_Names
                            }
                        }      
                        Log "Script" "######## `r`n$($ID.Name)`r`n $($SPlan | Select-Object * -Wait | Format-Table -AutoSize | Out-String)" 0 Yellow 
                    }
                    catch {
                        write-host $ID
                    }
                }
            }

            function Get-UsersInfo 
            {
                ## Display user information ##
                Log "Script" "Displaying user information" 1 Cyan
                try {
                    $userTop = Get-MgUser -Property UserPrincipalName, Mail, DisplayName, GivenName, Id -Top 15 -ErrorAction Stop | Select-Object UserPrincipalName, Mail, DisplayName, GivenName, Id -Wait
                    Log "Script" "$($userTop | Select-Object * -Wait | Format-Table -AutoSize | Out-String)" 0 Yellow
                }
                catch {
                    Log "Script" "Failed to retrieve user information." 0 Red
                    Get-DebugError $_ 0
                }
            }

            function Get-AllowedScopes 
            {
                ## Display authorized scopes ##
                Log "Script" "Displaying authorized scopes" 1 Cyan
                try {
                    $scopeOK = Get-MgContext -ErrorAction Stop | Select-Object Scopes -Wait
                    $scopeOK.scopes | ForEach-Object { Write-Host "`t - $($_)" -f Yellow }
                }
                catch {
                    Log "Script" "Failed to retrieve information about authorized scopes. Error message: $($_)" 0 Red
                    Get-DebugError $_ 0
                }
            }

            function Get-CommandsGraph 
            {
                param([string]$filter = "")	
                $cmdFound = Get-Command -Module "Microsoft.Graph*" | Select-Object Name,Source -Wait | Where-Object {$_.Name -like "*$filter*"} | Sort-Object Source,Name
                Log "Script" "$($cmdFound | Select-Object * -Wait | Format-Table -AutoSize | Out-String)" 0 Yellow
                
            }
           
            function Get-CommandsExchOnline
            {
                param([string]$filter = "")	
                $cmdFound = Get-Command -Module "ExchangeOnlineManagement" | Select-Object Name,Source -Wait | Where-Object {$_.Name -like "*$filter*"} | Sort-Object Source,Name
                Log "Script" "$($cmdFound | Select-Object * -Wait | Format-Table -AutoSize | Out-String)" 0 Yellow
                
            }

            function Get-APIPermission 
            {
                param([string]$command = "Get-MgUser")	
                try {
                    $PermCmdFound = Find-MgGraphCommand -Command $command -ErrorAction Stop| Select-Object -First 1 -ExpandProperty Permissions -Wait
                    if ($PermCmdFound) {
                        Log "Script" "$($PermCmdFound | Select-Object * -Wait | Format-Table -AutoSize | Out-String)" 0 Yellow
                    }else {
                        Log "Script" "Command Not Found, please make sur you get module for this command" 0 Yellow
                    }
                }
                catch {
                    Get-DebugError $_
                }
                
            }

        #endregion
        
        #region Initialisation
            if(-not (Test-CertThumbprint $CertThumbprint -My))
            {
                throw "No matching certificates with Thumbprint: $CertThumbprint, verify JSON File or import the certificate"
            }

            $CSV_FriendlyNameLicences = Import-Csv "$Path_Root\Product names and service plan identifiers for licensing.csv" -Delimiter ',' -Encoding UTF8
            $ProductName = $CSV_FriendlyNameLicences | Select-Object Product_Display_Name,String_Id,GUID -Unique
            Show-Param -LesParam $PSBoundParameters

            # Calculate the space used by log and result folders and check if it is within the specified limit
            $SpaceUsed = Test-SpaceFolders ($global:Path_Logs,$Path_Result) $FilesToKeep $SpaceMax
            Log "Script" "$ScriptName - use $SpaceUsed of $(WSize $SpaceMax) limit" 2 Cyan

        #endregion 
        
    }
    catch 
    {
        Get-DebugError $_ 
        exit 1
    }
}
Process
{
    try 
    {
        Log "Script" "Start of script : $($MyInvocation.MyCommand.Name)" 99 Cyan  
        
        #Si on lance juste pour deconnexion
        if($logoff)
        {
            Disconnect-MsGraphTenant | Out-Null
            Disconnect-ExchangeOnline -Confirm:$false -ErrorAction Continue
            exit 0
        }  
         
        # Deconnexion au cas ou mais sans erreur a afficher
        Disconnect-MsGraphTenant -Type Silently | Out-Null
        Disconnect-ExchangeOnline -Confirm:$false -ErrorAction SilentlyContinue
             
        Connect-MsGraphTenant -ClientId $clientId -TenantId $tenantId -CertThumbprint $CertThumbprint
        $Script:MsGraphState = $true

        Show-MenuConnexion | Out-Null
         
        if ($(Show-Menu) -eq $false)
        {
            Log "Script" "The connection remains open. You can enter the commands you want." 1 Green
        }
 
    }
    catch 
    {
        Get-DebugError $_
        exit 1
    }
}
End
{
    try
    {
        $Temps = ((Get-Date )-(Get-Date $StartScript)).ToString().Split('.')[0]
        Log "Script" "Running time : " 1 Cyan -NoNewLine ;  Log "Script" "[$($Temps.Split(':')[0])h$($Temps.Split(':')[1])m$($Temps.Split(':')[2])s]" 1 Red -NoDate
        Log "Script" "Script end : " 1 Cyan -NoNewLine ;  Log "Script" "[$($MyInvocation.MyCommand.Name)]" 1 Red -NoDate
        exit 0
    }
    catch 
    {
        Get-DebugError $_
        exit 1
    }
}

