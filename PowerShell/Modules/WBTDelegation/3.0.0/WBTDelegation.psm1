$ErrorActionPreference = 'Stop'

#region LOGS FUNCTION
Function Log {
    Param (
        [Parameter(Mandatory=$true, Position=0)][string[]]$Contexts,
        [Parameter(Mandatory=$true, Position=1)][string[]]$sInput, 
        [Parameter(Mandatory=$false, Position=2)][int]$lvl = 0,
        [Parameter(Mandatory=$false, Position=3)][string]$color = "Cyan",
        [Parameter(Mandatory=$false, Position=4)][string]$LogPath = $global:Path_Logs,
        [Parameter(Mandatory=$false, Position=5)][string]$CustomName ="",
        [Parameter(Mandatory=$false, Position=6)][switch]$NoOutPut,
        [Parameter(Mandatory=$false, Position=7)][switch]$NoNewLine,
        [Parameter(Mandatory=$false, Position=8)][switch]$NoDate,
        [Parameter(Mandatory=$false, Position=9)][string]$CustomBeginText =""
    )
    if([string]::IsNullOrEmpty($global:Path_Logs)){
        $global:Path_Logs = "C:\DefautsScript-Logs\"
    }
    # Retrieve the full path of all folders (contexts) to write logs
        $logFolders = $Contexts | ForEach-Object { Join-Path $LogPath $_ }
    
    # Retrieve the full paths of the log files to write
        $sLogFile = Join-Path $logFolders ("Log_" + $global:Date_Logs_File + $CustomName +".log")
    
    # Format each line to be written in the logs
        $sLineTimeStamp = Get-Date -f "dd/MM/yyyy HH:mm:ss"
        $sLine = $sInput | ForEach-Object { $sLineTimeStamp + " - " + $CustomBeginText + $_ }

     # If -NoOutput is specified, the function does not write a log file
    if (-not $NoOutPut) 
    { 
        # Test the folders and create them if necessary
        Test-Folder $logFolders

        # For each log file to write to,
        $sLogFile | ForEach-Object { 
           
            if ($noNewLine) 
            {                     
                $sLine | Out-File $_ -Append -Force -NoNewline
            }
            elseif ($noDate) 
            {
                $sInput -join "`r`n" | Out-File $_ -Append -Force
            }
            else
            {
                $sLine -join "`r`n" | Out-File $_ -Append -Force
            }
        }
    }
    # Display in the PowerShell console if the VerboseLvl is greater than or equal to the defined level
    if ($lvl -le $Global:VerboseLvl) { 
        if ($noNewLine) 
        { 
            Write-Host ($sLine) -ForegroundColor $color -NoNewline
        }
        elseif ($noDate) 
        {
            Write-Host ($sInput -join "`r`n") -ForegroundColor $color
        }
        else
        {
            Write-Host ($sLine -join "`r`n") -ForegroundColor $color
        }
    }
}

Function Get-DebugError {
    [cmdletbinding()]
    param (
        [Parameter(Mandatory=$true, Position=0)]$e,
        [Parameter(Mandatory=$false, Position=1)]$num = 1,
        [Parameter(Mandatory=$false, Position=2)]$custom = ""
    )
    try {
        if($custom -ne ""){$custom+= " - "}
        Log "Error" "ERROR FOUND ################################################################################################################" 99
        Log "Error" "Error - Line  [$($e.InvocationInfo.ScriptLineNumber)] - $custom `$_ = $($e)" $num Red  
        Log "Error" "Error - Line  [$($e.InvocationInfo.ScriptLineNumber)] - StackTrace = $($e.ScriptStackTrace)" 99 Red
        Log "Error" "Error - Line  [$($e.InvocationInfo.ScriptLineNumber)] - ExceptionType = $($e.Exception.GetType().FullName)" 99 Red
        Log "Error" $(($e | Select-Object * | Format-List | Out-String)) 99 Red
        #Log "Error" $(($e.Exception | Select-Object * | Format-List | Out-String)) 99 Red
    }
    catch {
        write-host $_
    }
   
}
#endregion LOGS FUNCTION

#region TESTING FUNCTION

function Test-Folder {
    param (
        [string[]]$Path  # An array of folder paths to check and create if they don't exist.
    )
    # Loop through each specified folder path.
    foreach ($folderPath in $Path) 
    {
        if (-not (Test-Path $folderPath)) 
        {
            try
            {
                # Attempt to create the folder if it doesn't exist.
                mkdir $folderPath | Out-Null
            }
            catch
            {
                # Handle any errors that occur during folder creation.
                Log "Script" "Unable to create the folder [$folderPath] `r`n Error Message :$($_)" 0 Red
                Get-DebugError $_
            }
        }
    }   
}
function Test-SpaceFolders {
    param (
        [string[]]$Path,         # An array of folder paths to check.
        [int]$Keep=100,          # Maximum number of items (files) to keep in each folder (100 default).
        [long]$Max=1048576       # Maximum size in bytes each folder should not exceed (1MB default).
    )
    [psobject[]]$AllItems = @()     # Initialize an array to hold all file items across folders.
    [long]$AllItemsSize = 0         # Initialize total size of all items.
    [int]$AllItemsCount = 0         # Initialize total count of all items.

    [int]$FolderCount = $path.Count
    [long]$MaxFolder = $Max / $FolderCount

    foreach ($folderPath in $Path) {
        if ([string]::IsNullOrEmpty($folderPath)){continue}
        [psobject[]]$FolderItems = @()   # Initialize an array to hold file items in the current folder.
        [long]$FolderSize = 0            # Initialize the size of the current folder.
        [int]$FolderCount = 0            # Initialize the count of items in the current folder.

         # Generate a label for the current folder.
        $Folder = "[$(Split-Path $(Split-Path $folderPath -Parent) -leaf)\$(Split-Path $folderPath -Leaf)]"
       

        # Retrieve all files in the folder and check their size.
        Test-Folder $folderPath
        $FolderItems = (get-childitem $folderPath -Recurse) | Where-Object {$_.Attributes -notmatch "Directory" -and $(split-path $_.DirectoryName -Leaf) -notlike "*error*"} | Select-Object Name,FullName,@{l='size';e={[long]$_.Length}},LastWriteTimeUtc | Sort-Object LastWriteTimeUtc
        $FolderSize = $($FolderItems | Measure-Object -Property size -sum).sum
        $FolderCount = $FolderItems.count
        if ($null -eq $FolderSize){$FolderSize = 0}
        Log "Script" "Size Limit $(WSize $FolderSize)/$(WSize $MaxFolder)`t|  Items Limit $FolderCount/$Keep `t|  $Folder" 2 Cyan

        #Si folder depasse les conditions (defaut : 1Mb et 100 fichiers)
        $i = 0
        if ( $FolderSize -ge $MaxFolder -or $FolderCount -gt $Keep){           
            while ($FolderSize -ge $MaxFolder -or $FolderCount -gt $Keep) {                
                $ItemToDelete = $FolderItems[$i]
                try {
                    Remove-Item $ItemToDelete.FullName -Force -Confirm:$false -ErrorAction Stop
                    $FolderSize -= $ItemToDelete.size 
                    $FolderCount -= 1                  
                    Log "Script" "Deleting [$($ItemToDelete.Name)] - Size Limit $(WSize $FolderSize)/$(WSize $MaxFolder)`t|  Items Limit $FolderCount/$Keep" 3 DarkGray
                }
                catch {
                    # Handle any errors during item deletion.
                    Get-DebugError $_ 
                }
                $i++
            }
           # $i--
        }
        Log "Script" "$i Item(s) deleted" 2 Green
        # Add the folder's items to the total counts.
        $AllItems += $FolderItems
        $AllItemsSize += $FolderSize
        $AllItemsCount += $FolderCount
    }

    return (WSize $AllItemsSize)  # Return the total size of all items.
}

#endregion TESTING FUNCTION

#region OUTPUT FUNCTION
Function WSize {
    Param ($size,$digit = 2)
    if ($($size / 1TB) -ge 1){
        return "$([math]::Round(($size / 1TB),$digit)) To"
    }elseif ($($size / 1GB) -ge 1){
        return "$([math]::Round(($size / 1GB),$digit)) Go"
    }elseif ($($size / 1MB) -ge 1){
        return "$([math]::Round(($size / 1MB),$digit)) Mo"
    }elseif ($($size / 1024) -ge 1){
        return "$([math]::Round(($size / 1024),$digit)) Ko"
    }else{
        return "$size Octet"
    }
}

Function WDate {
    Param (
        $dateW,
        [Parameter(Mandatory = $true)][ValidateSet("Day","Hour","Minute","Second")]
        [string]$typeInput,
        [Parameter(Mandatory = $false)][ValidateSet("Max","Day","Hour","Minute","Second")]
        [string]$typeOutput = "Max"
    )
    switch ($typeInput) {
        "Day" {
            $TimeSpan = New-TimeSpan -Days $dateW
        }
        "Hour" {
            $TimeSpan = New-TimeSpan -Hours $dateW
        }
        "Minute" {
            $TimeSpan = New-TimeSpan -Minutes $dateW
        }
        "Second" {
            $TimeSpan = New-TimeSpan -Seconds $dateW
        }
        Default {return $dateW}
    }

    if ($TimeSpan.Days -ge 1){
        $dStr = "$($TimeSpan.Days) Days"
    }else{
        $dStr = ""
    }
    if ($TimeSpan.Hours -ge 1){
        $hStr = "$($TimeSpan.Hours) h"
    }else{
        $hStr = ""
    }
    if ($TimeSpan.Minutes -ge 1){
        $mStr = "$($TimeSpan.Minutes) min"
    }else{
        $mStr = ""
    } 
    if ($TimeSpan.Seconds -ge 1){
        $sStr = "$($TimeSpan.Seconds) sec"
    }else{
        $sStr = ""
    }
switch ($typeOutput) {
    "Day" { return "$dStr"  }
    "Hour" { return "$dStr $hStr"  }
    "Minute" { return "$dStr $hStr $mStr "  }    
    "Second" { return "$dStr $hStr $mStr $sStr"  }
    "Max" { return "$dStr $hStr $mStr $sStr"  }
    Default {}
}
    

}
function Start-WaitingTime($Minutes = 0,$Second = 0,$Activity = "RAS",$Status = "Status") {
   [double]$seconds = 0
    $seconds += (New-TimeSpan -Minutes $Minutes).TotalSeconds
    $seconds += (New-TimeSpan -Seconds $Second).TotalSeconds
    
    $doneDT = (Get-Date).AddSeconds($seconds)
   
    while($doneDT -gt (Get-Date)) 
    {
        $secondsLeft = $doneDT.Subtract((Get-Date)).TotalSeconds
        $percent = ($seconds - $secondsLeft) / $seconds * 100
        Write-Progress -Activity $Activity -Status $Status -SecondsRemaining $secondsLeft -PercentComplete $percent
        [System.Threading.Thread]::Sleep(500)
    }
    Write-Progress -Activity $Activity -Status $Status -SecondsRemaining 0 -Completed
}
function Show-Param {
    param (
        [Parameter(Mandatory=$false, Position=0)]$LesParam,
        [Parameter(Mandatory=$false, Position=1)]$Lvl = 1,
        [switch]$lesreturn
      
    )
    $tab = ""
    $lesKey = $LesParam.keys
    Log "Script" "`t(Debug) Parameter send to the script :" $Lvl yellow 
    foreach ($key in $lesKey) {            
        Log "Script" "`t`t- $key = $($LesParam.$key)" $Lvl yellow     
        if ($lesreturn){$tab += "$key = $($LesParam.$key)<br>"}        
    }    
    if ($lesreturn){return $tab}       
}

# Fonction pour récupérer la première lettre alphabétique d'une chaîne
function Get-FirstAlphabeticLetter {
    param(
        [string]$Global:Inputstring,
        [switch]$AndLast
    )

    if ($null -eq $Global:Inputstring -or $Global:Inputstring.Length -eq 0) {
        Log "Script" "La chaîne est vide." 1 Red
        return
    }

    $firstAlphabeticLetter = $null

    foreach ($char in $Global:Inputstring.ToCharArray()) {
        if ($char -match "[a-zA-Z]") {
            $firstAlphabeticLetter = $char
            break
        }
    }

    if ($null -eq $firstAlphabeticLetter) {
        Log "Script" "Aucune lettre alphabétique trouvée dans la chaîne." 1 Red
        return
    }
    if ($AndLast){
        return $firstAlphabeticLetter + $Global:Inputstring[-1]
    }else{
        return $firstAlphabeticLetter
    }
    
}

#endregion OUTPUT FUNCTION
function Format-Name($name) {
    $groupName = $name
    #verifie si il y a des [variable] entre crochet a remplacer dans le XML

    if ($groupName -match '\[([^[\]]+)\]') {
        $domValue = $matches[1]  # Récupère la valeur entre [] de $groupName
        #Log "Script" "Il y a $($matches.Count /2) dans $groupName" 1 cyan
        if ([string]::IsNullOrEmpty($Global:Script_Inputs_Hashtable)) {
            Log "Script" "Warning ! $groupName need to be custom, use InputParameter" 1 Red
            Log "Script" "Do you want custom now ? (y/n)" 1 Magenta -NoNewLine
            if ($(Read-Host).ToLower() -eq "y") {
                $Global:Script_Inputs_Hashtable.Add("$domValue",$(Read-Host "$domValue"))
                Format-Name $groupName
            }else{
                exit -1
            }
        }elseif ($Global:Script_Inputs_Hashtable.keys -notcontains $domValue ) {           
            # Si $Inputs ne contient pas la valeur "Dom", affichez un message d'avertissement ou effectuez une action appropriée
            Log "Script" "Warning ! $groupName need to be custom, use InputParameter for [$domValue]" 1 Red
            Log "Script" "Actual Inputs : `r`n$($Global:Script_Inputs_Hashtable.keys | Format-Table | Out-String)" 1 Red -NoDate

            Log "Script" "Do you want custom now ? (y/n)" 1 Magenta -NoNewLine
            if ($(Read-Host).ToLower() -eq "y") {
                $Global:Script_Inputs_Hashtable.Add("$domValue",$(Read-Host "$domValue"))
                Format-Name $groupName
            }else{
                exit -1
            }
        }else{
            $groupName = $groupName -ireplace [regex]::Escape("[" + $domValue + "]") , $Global:Script_Inputs_Hashtable.$domValue
            return Format-Name $groupName
        }
    }
    else {
        return $groupName
    }
}
function Get-Path($node) {
    try {
        if ( $node.GetType().Name -ne 'XmlDocument' ) {
            $name = Format-Name -name $node.Name
            return "OU={1},{0}" -f (Get-Path -node $node.ParentNode), $name
        } 
    }
    catch {
        Get-DebugError $_ 
    }
   
}

function Get-Canonical($node) {
    try {
        if ( $node.GetType().Name -ne 'XmlDocument' ) {
            $name = Format-Name -name $node.Name
            if ($name -ne "OrgUnit") {
                return "{0}/{1}" -f (Get-Canonical -node $node.ParentNode), $name
            }else{
                Get-Canonical -node $node.ParentNode
            }
        }
    }
    catch {
        Get-DebugError $_ 
    }
    
}

function Get-XMLInfo ($node,[hashtable]$Output,$DomainDN) {

   try {
        switch ( $node.LocalName ) {
            "Root" {      
                $RootName = Format-Name $node.Name
                $RootPath = Format-Name $Global:RessourceDomain_DN

                $cano = $(Get-Canonical $node) -Replace "/Root", $($Global:RessourceDomain_DN).Replace(",DC=",".").Replace("DC=","")
                $OUItem = New-Object PSObject    
                $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Domain"        -Value $Global:RessourceDomain_DNSName
                $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Name"        -Value $RootName
                $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Path"        -Value $RootPath
                $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "CanonicalName"  -Value $cano
                $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Description" -Value $(Format-Name $node.Description)      
                $OUItem | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "Delegation"  -Value $null           
                $OUItem | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "Groups"        -Value $null
                $key = $(Get-Canonical $node) -Replace"/Root", $($Global:RessourceDomain_DN).Replace(",DC=",".").Replace("DC=","")
                $Output["$key"] = $OUItem
            }
            "OrgUnit" {  
                    $path = Get-Path -node $node.ParentNode
                    $OUName = Format-Name $node.Name
                    if ($node.AdmOnly -eq "True") {
                        $OUPath = Format-Name $($path.Replace("OU=Root,", $Global:AdminDomain_DN))
                        $OUCano = $(Get-Canonical $node) -Replace"/Root", $($Global:AdminDomain_DN).Replace(",DC=",".").Replace("DC=","")
                    }else{
                        $OUPath = Format-Name $($path.Replace("OU=Root,", $Global:RessourceDomain_DN))
                        $OUCano = $(Get-Canonical $node) -Replace"/Root", $($Global:RessourceDomain_DN).Replace(",DC=",".").Replace("DC=","")    
                    }
                  
                    $OUItem = New-Object PSObject                       
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Name"        -Value $OUName
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Path"        -Value $OUPath
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "AdmOnly"        -Value $node.AdmOnly
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "CanonicalName" -Value $OUCano
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName string   -Name "Description" -Value $(Format-Name $node.Description)           
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "Delegation"  -Value $null           
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "Groups"       -Value $null

                
                try {
                    Get-ADOrganizationalUnit -Server $Global:RessourceDomain_DNSName -Identity ("OU=" + $OUName + "," + $OUPath) -ErrorAction Stop | Out-Null
                    Log "Script" "[OrgUnit] - $OUName exist" 3 DarkGreen
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName bool -Name "OUExist" -Value $true
                }
                catch {
                    Log "Script" "[OrgUnit] - $OUName didn't exist" 3 DarkYellow
                    $OUItem | Add-Member -MemberType NoteProperty -TypeName bool -Name "OUExist" -Value $false
                }  
                try {
                    $key = $(Get-Canonical $node) -Replace"/Root", $DomainDN.Replace(",DC=",".").Replace("DC=","")
                    $Output["$key"]= $OUItem
                }
                catch {
                    Get-DebugError $_
                }                
            }
            "Delegation" {
                $delGroupName = $(Format-Name $node.DelegateGroup)
                $delGroupPath = $(Format-Name $node.DelegateGroupPath)
                if (-not [string]::IsNullOrEmpty($delGroupPath)) 
                {

                    if ($node.AdmGroup -eq "True")
                    {
                        $delGroupPath += ("," + $Global:AdminDomain_DN)
                    }
                    else
                    {
                        $delGroupPath += ("," + $Global:RessourceDomain_DN)
                    }
                }
                $delGroupPath = $(Format-Name $delGroupPath)
                $delGroupDesc = $(Format-Name $node.DelegateGroupDescription)
                $DelegationOU= New-Object PSObject
                   
                
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "Identity"               -Value $node.Identity
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "ACLGroup"               -Value $node.ACLGroup
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "Inheritance"            -Value $node.Inheritance
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "OUObject"               -Value $node.OUObject
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "JustObject"             -Value $node.JustObject
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "DenyRight"              -Value $node.DenyRight
                
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "AdmGroup"              -Value $node.AdmGroup

                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "DelegateGroup"       -Value $delGroupName
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "DelegateGroupScope"  -Value $node.DelegateGroupScope
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "DelegateGroupDesc"   -Value $delGroupDesc
                $DelegationOU | Add-Member -MemberType NoteProperty -TypeName string -Name "DelegateGroupPath"   -Value $delGroupPath
               
           
            [PSObject]$rolesG = @()
            if ([string]::IsNullOrEmpty($node.Roles)) 
            {
                $rolesG = $null
            }
            else
            {
                foreach ($group in $(($node.Roles).split(','))) 
                {
                    $RoleGroup= New-Object PSObject
                    $RoleGroupName = $(Format-Name $group)
                    $RoleGroupPath = $(Format-Name $node.RolesGroupPath)
                    $RoleGroupDesc = $(Format-Name $node.RolesGroupDescription)
                    if (-not [string]::IsNullOrEmpty($RoleGroupPath)) {
                        $RoleGroupPath += ("," + $Global:AdminDomain_DN)
                    }
                    $RoleGroupPath = $(Format-Name $RoleGroupPath)

                        $RoleGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "RoleGroup"       -Value $RoleGroupName
                        $RoleGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "RoleGroupDesc"   -Value $RoleGroupDesc
                        $RoleGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "RoleGroupPath"   -Value $RoleGroupPath
                        $RoleGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "RoleGroupScope"  -Value $node.RoleGroupScope
                        $rolesG += $roleGroup
                    
                }
            }
            $DelegationOU | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "RolesGroups" -Value $rolesG
            $key = $(Get-Canonical $node.ParentNode) -Replace"/Root", $DomainDN.Replace(",DC=",".").Replace("DC=","")
            if ($null -eq $Output.$key.Delegation) {
                $Output.$key.Delegation = @()
            }
            Log "Script" "Addind delegation rule to OU $key" 3 DarkGray
            $Output.$key.Delegation += $DelegationOU
           
            
            }
            "Group" {
                $GroupName = $(Format-Name $node.Name)
                $GroupDesc = $(Format-Name $node.Description)

                $key = $(Get-Canonical $node.ParentNode) -Replace"/Root", $DomainDN.Replace(",DC=",".").Replace("DC=","")
                if ($null -eq $Output.$key.Groups) {
                    $Output.$key.Groups = @()
                }
                # Si RessPath non specifié, on prends le path de OrgUnit parent
                if([string]::IsNullOrEmpty($node.RessPath)){
                    $GroupPath = "OU=" + $(Format-Name $Output.$key.Name)+ "," + $(Format-Name $Output.$key.Path)
                    $GroupPath = $(Format-Name $GroupPath)
                }elseif($DomainDN -eq $Global:AdminDomain_DN ){
                    $GroupPath = "OU=" + $(Format-Name $Output.$key.Name)+ "," + $(Format-Name $Output.$key.Path)
                    $GroupPath = $(Format-Name $GroupPath)
                }else{
                    # Sinon on prend le RessPath et on ajoute le domaine ADM
                    $GroupPath = $(Format-Name $node.RessPath)
                    if ($node.RessPath -notlike "*DC=*") {
                        $GroupPath += ("," + $Global:AdminDomain_DN)
                    }
                    
                }

                $ObjGroup= New-Object PSObject                   
                $ObjGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "Name"  -Value $GroupName
                $ObjGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "Description"  -Value $GroupDesc
                $ObjGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "Path"  -Value $GroupPath
                $ObjGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "Scope" -Value $node.Scope

                [PSObject]$Members = @()
                if ([string]::IsNullOrEmpty($node.MembersName)) 
                {
                    $Members = $null
                }
                else
                {
                    foreach ($group in $(($node.MembersName).split(','))) 
                    {
                        $MemberGroup= New-Object PSObject
                        $MemberGroupName = $(Format-Name $group)
                        $MemberGroupDesc = $(Format-Name $node.MembersDescription)

                        $MemberGroupPath = $(Format-Name $node.MembersPath)
                        if (-not [string]::IsNullOrEmpty($MemberGroupPath)) {
                            $MemberGroupPath += ("," + $Global:AdminDomain_DN)
                            $MemberGroupPath = $(Format-Name $MemberGroupPath)
                        }
                      
                        $MemberGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "MembersName"        -Value $MemberGroupName
                        $MemberGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "MembersDescription" -Value $MemberGroupDesc
                        $MemberGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "MembersPath"        -Value $MemberGroupPath
                        $MemberGroup | Add-Member -MemberType NoteProperty -TypeName string -Name "MembersScope"       -Value $node.MembersScope
                        
                        $Members += $MemberGroup
                    }
                }
                $ObjGroup | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "Members" -Value $Members
            
                Log "Script" "Adding group" 3 DarkGray
                $Output.$key.Groups += $ObjGroup
            }
            "RoleInTask" {      

                $RinT = New-Object PSObject
                $RinT | Add-Member -MemberType NoteProperty -TypeName string   -Name "RoleName"        -Value $(Format-Name $node.Role)
                [PSObject]$Tasks = @()
                if ([string]::IsNullOrEmpty($node.Tasks)) 
                {
                    $Tasks = $null
                }
                else
                {
                    foreach ($group in $(($node.Tasks).split(','))) 
                    {
                        $Tasks += [pscustomobject]@{
                            "TaskName" = $(Format-Name $group)
                        }
                    }
                }
                $RinT | Add-Member -MemberType NoteProperty -TypeName PSObject -Name "Tasks" -Value $Tasks
                if ($null -eq $Output["RoleInTask"]) {
                    [PSObject]$Output["RoleInTask"] = @()
                }
                $Output["RoleInTask"] += $RinT
                
                
            }
        }

        foreach ($childNode in $node.ChildNodes) {
            $Output = Get-XMLInfo -node $childNode -Output $Output  -DomainDN $DomainDN
        }
        return $Output
    }
    catch {
        Get-DebugError $_
    }
}

Function Out-KeyOrdered 
{
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)][HashTable]$HashTable,
        [Parameter(Mandatory = $false, Position = 1)][ScriptBlock]$Function,
        [Switch]$Descending
    )
    $Keys = $HashTable.Keys | ForEach-Object {$_} # Copy HashTable + KeyCollection
    For ($i = 0; $i -lt $Keys.Count - 1; $i++) {
        For ($j = $i + 1; $j -lt $Keys.Count; $j++) {
            $a = $Keys[$i]
            $b = $Keys[$j]
            If ($Function -is "ScriptBlock") {
                $a = $HashTable[$a] | ForEach-Object $Function
                $b = $HashTable[$b] | ForEach-Object $Function
            }
            If ($Descending) {
                $Swap = $a -lt $b
            }
            Else
            {
                $Swap = $a -gt $b
            }
            If ($Swap) {
                $Keys[$i], $Keys[$j] = $Keys[$j], $Keys[$i]
            }
        }
    }
    Return $Keys
}



function Get-OUName ($OUPath){
    if ($OUPath -like "*OU=*") {
        return $($OUPath.split(",",2)[0]).Replace("OU=","")  
    }
    return ""
}
function Get-OUPath ($OUPath) {
    if ($OUPath -like "*OU=*") {
        return $OUPath.split(",",2)[1]
    }
    return $OUPath
}

function Get-Canonicalv2([string]$OUPath,[string]$OUName) {

    $canonicalName = ""

    # Séparer les composants du distinguishedName
    $components = $OUPath -split '(?<!\\),'

    # Inverser l'ordre des composants
    [string[]]$reversedComponents = $components | Where-Object {$_ -notlike "*DC=*"} | ForEach-Object { ($_ -split '=', 2)[1] }
    [string[]]$dom = $components | Where-Object {$_ -like "*DC=*"} | ForEach-Object { ($_ -split '=', 2)[1] }
    # Reconstituer le CanonicalName
    $canonicalName = "/" + $($dom -join ".")
    for ($i = $reversedComponents.Count -1; $i -ge 0 ; $i--) {
        $canonicalName += "/" + $reversedComponents[$i]
    }
   
    return $($canonicalName + "/" + $OUName)
}

function Get-Domain ($OUPath) {
    $tmpDom = $OUPath.split("DC=")| ForEach-Object{ $_.Replace(",","") | Where-Object {$_ -ne ""}}
    return $($tmpDom[-2] + "." + $tmpDom[-1])
}

function Get-FormatOU ($OUName,$OUPath,$OUDescription=""){
        
        $Canonical = Get-Canonicalv2 -OUPath $OUPath -OUName $OUName
        $Domain = Get-Domain $OUPath
        $OUNamee = if([string]::IsNullOrEmpty($OUName)){Get-OUName $OUPath}else{$OUName}
        $OUPathh = $OUPath
        [pscustomobject[]]$OUVerify = [pscustomobject]@{
            "Domain"=$Domain;
            "Canonical"=$Canonical;
            "Name"=$OUNamee;
            "Path"=$OUPathh;
            "Description"=$OUDescription;
        }
        Write-host "OUtput : $OUNamee | $OUPathh" -f Yellow 
        
        if ($OUPath -notlike "DC=*") {  
            
             $OUVerify += Get-FormatOU -OUName $(Get-OUName $OUPath) -OUPath $(Get-OUPath $OUPath)
        }
        
        return $OUVerify
}

function Get-FormatAllOU {
    Param( 
        [PSCustomObject[]]$AllOU
    )
    [PSCustomObject[]]$AllOUVerif=@{}
    foreach ($OU in $AllOU) {
        if (-not [string]::IsNullOrEmpty($OU.Path)) {
            $AllOUVerif += Get-FormatOU -OUName $OU.Name -OUPath $OU.Path -OUDescription $OU.Description
        }        
    }

    return [PSCustomObject[]]$($AllOUVerif| Where-Object {-not [string]::IsNullOrEmpty($_.Name)} | Select-Object Domain,Canonical,Name,Path,Description -Unique) | Sort-Object Domain,Canonical


}

Function Test-OUs
{
    Param( 
        $OUName, 
        $OUPath, 
        $Description, 
        [bool]$Protected = $true ,
        $Server = $Global:RessourceDomain_DNSName,
        [switch]$whatIf = $false 
    )
    $count = ($OUPath.Split(',')).Count - 2
    $affichage = "`t" * $count

    
    try {
        If (([adsi]::Exists("LDAP://OU=$OUName,$OUPath" )) -Eq $false ) 
        {
            if (-not $whatIf) {
                Start-Sleep -Milliseconds 400

                
                $pp = $OUPath.split("DC=")| ForEach-Object{ $_.Replace(",","") | Where-Object {$_ -ne ""}}
                $dom = $pp[-2] + "." + $pp[-1]

                New-ADOrganizationalUnit -Server $Dom -Name $OUName -Path $OUPath -Description $Description -ProtectedFromAccidentalDeletion $Protected 
                Log "Script" "Creation de l'OU `t$affichage |_ $OUName `t- [$OUPath]" 1 Cyan
            }else{
                Log "Script" "Whatif - Creation de l'OU `t$affichage |_ $OUName `t- [$OUPath]" 1 Gray
            }              
            return 1
        }else{
            Log "Script" "L'ou existe deja `t$affichage |_ $OUName `t- [$OUPath]" 1 Green
            return 0
        }
    }
    catch {
        Log "Error" "Error in : LDAP://OU=$OUName,$OUPath" 1 red
       Get-DebugError $_
       return 1
    }
    

    
    
}


$scp = [System.Enum]::GetNames([Microsoft.ActiveDirectory.Management.ADGroupScope])
Function Test-ADGroups
{
    Param( 
        $GroupName, 
        $GroupDisplayName, 
        $GroupPath,
        $GroupDescription,    
        [bool]$Protected = $true,   
        [switch]$whatIf = $false,
        [ArgumentCompleter({
        param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
            $scp
        })]$groupScope,
        $Server = $Global:RessourceDomain_DNSName
    )
    try{
        if ($null -eq $GroupPath) {
            try{
                $gg = Get-ADGroup -Server $Server -Identity $GroupName -ErrorAction SilentlyContinue
                Log "Script" "Le groupe existe deja $GroupName [$($gg.DistinguishedName)]" 1 Green
                return 0
            }catch{
                Get-DebugError $_
                return -1
            }
        }
        elseif (([adsi]::Exists("LDAP://CN=$GroupName,$GroupPath" )) -Eq $false )
        {
            $pp = $GroupPath.split("DC=")| ForEach-Object{ $_.Replace(",","") | Where-Object {$_ -ne ""}}
            $dom = $pp[-2] + "." + $pp[-1]
            if ([string]::IsNullOrEmpty($(try{($gg = Get-ADGroup -Server $dom -Identity $GroupName -ErrorAction SilentlyContinue)}catch{$null})))
            {
                If (([adsi]::Exists("LDAP://$GroupPath" )) -Eq $false -and $WhatIf -eq $false)
                {
                    Log "Script" "Waiting OU creation 5 sec - [$GroupPath]" 1 Cyan
                    Start-sleep 5
                }
                if ([string]::IsNullOrEmpty($groupScope)) {
                    $groupScope = "DomainLocal"
                }
                if (-not $whatIf) {
                    if ($GroupDisplayName){
                        New-ADGroup -Server $dom -name $GroupName -GroupCategory Security -GroupScope $groupScope -Path $GroupPath -Description $GroupDescription -DisplayName $GroupDisplayName
                    }else{
                        New-ADGroup -Server $dom -name $GroupName -GroupCategory Security -GroupScope $groupScope -Path $GroupPath -Description $GroupDescription 
                    }
                    Get-ADGroup -Server $dom -Identity $GroupName  | Set-ADObject -Server $dom -ProtectedFromAccidentalDeletion $Protected
                    
                    Log "Script" "Creation reussi du groupe $GroupName - [$GroupPath] - [$groupScope] - [$dom]" 1 Green
                }else{
                    Log "Script" "Whatif - Creation du groupe $GroupName - [$GroupPath] - [$groupScope]" 1 Gray
                }  
            }else{
                Log "Script" "Le group exite mais dans une autre OU $GroupName [$($gg.DistinguishedName)] != $GroupPath" 1 yellow
                return 0
            }        
        }else{
            Log "Script" "Le groupe existe deja $GroupName - [$GroupPath]" 1 Cyan
            return 0
        }
        return 1
    }catch {
        log "Error" "Error in : LDAP://CN=$GroupName,$GroupPath for $dom" 1 red
        Get-DebugError $_
        return -1
    }
    
}
function Set-ADDelegation()
{
    param (
    [Parameter(Mandatory)] [string]$OU,
    [switch]$returnError = $false,
    $Server = $Global:RessourceDomain_DNSName,
    [switch]$whatIf = $false,
   
    [string]$Identity,
    $Group,

    [Parameter(Mandatory)]
    [ArgumentCompleter({
        param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
        $AllAccessControlType
        })]
    [ValidateScript({$_ -in $AllAccessControlType})]  
    [string]$Grant,

    [Parameter(Mandatory)]
    [ArgumentCompleter({
        param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
        $AllActiveDirectorySecurityInheritance
        })]
    [ValidateScript({$_ -in $AllActiveDirectorySecurityInheritance})]  
    [string]$Inheritance,

    [Parameter(Mandatory)]
    [ArgumentCompleter({
        param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
        $ObjectTypeToStringVar.Values # | Where-Object {$_ -like "*user*" }
    })]        
    [ValidateScript({$_ -in $AllObjectTypeGUID.Keys})]        
    [string]$Object,

    [Parameter(Mandatory)]
    [ArgumentCompleter({
        param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams)
        $ObjectTypeToStringVar.Values # | Where-Object {$_ -like "*user*" }
    })]        
    [ValidateScript({$_ -in $AllObjectTypeGUID.Keys})]        
    [string]$InheritedObject,

    [Parameter(Mandatory)]
    [ArgumentCompleter({param($Command, $Parameter, $WordToComplete, $CommandAst, $FakeBoundParams);$AllActiveDirectoryRights})]        
    [ValidateScript({$_ -in $AllActiveDirectoryRights})]
    [string[]]$ActiveDirectoryRight

    )
    $CurrentServer = (Get-ADDomain).DNSRoot
    $ad = "AD:"
    if ($Server -ne $CurrentServer){
        
        $ad = "AD2:"
        try {
            Get-PSDrive -Name AD2 -ErrorAction stop | Out-Null
        }
        catch {
            try {
                New-PSDrive -Name AD2 -PSProvider ActiveDirectory -Server $Server -root "//RootDSE/" -Scope Global  | out-null
            }
            catch {
                Get-DebugError $_
                exit 1
            }
            
        }
   
    }
    $path = "$ad\$OU"
    if (-not $whatIf) {
        try {
            $ACL = Get-Acl -path $path 
        }
        catch {
            Log "Error" "Error on : $path" 1 Red
            Get-DebugError $_
        }
        
    }else{
        $ACL = $null
    } 
    
    if([string]::IsNullOrEmpty($Identity) -and $group){
        $sid = [System.Security.Principal.SecurityIdentifier] $group.SID
        $Iden = [System.Security.Principal.IdentityReference] $SID
    }elseif (($Identity.ToLower() -eq "everyone") -or ($Identity.ToLower() -eq "tout le monde"))
    {
        $Iden = [System.Security.Principal.IdentityReference][System.Security.Principal.SecurityIdentifier] "S-1-1-0"
    }
    elseif ($Identity.ToLower() -eq "self")
    {
        $Iden = [System.Security.Principal.IdentityReference][System.Security.Principal.SecurityIdentifier] "S-1-5-10"
    }elseif ($WellKnowDomainGroup.Keys -contains $Identity.ToLower())
    {
        $domaineSID = (Get-ADDomain -Server $Server).DomainSID
        $Iden = [System.Security.Principal.IdentityReference][System.Security.Principal.SecurityIdentifier] $($domaineSID.Value + $WellKnowDomainGroup."$($Identity.ToLower())")
    }
    else
    {
        if (-not $whatIf) {
            $group = Get-ADGroup $Identity -Server $Server
            $sid = [System.Security.Principal.SecurityIdentifier] $group.SID
            $Iden = [System.Security.Principal.IdentityReference] $SID
        }       
    }
    $AccessControlType = [System.Security.AccessControl.AccessControlType] $Grant
    
    $ActiveDirectoryRights = [System.DirectoryServices.ActiveDirectoryRights] $ActiveDirectoryRight
    $InheritanceType = [System.DirectoryServices.ActiveDirectorySecurityInheritance] $Inheritance

    $ObjectType = $AllObjectTypeGUID["$Object"]
    $InheritedObjectType =  $AllObjectTypeGUID["$InheritedObject"]

    try
    {
        if (-not $whatIf) {
            $ACE = New-Object System.DirectoryServices.ActiveDirectoryAccessRule $Iden, $ActiveDirectoryRights, $AccessControlType, $ObjectType, $InheritanceType, $InheritedObjectType
            $ACL.AddAccessRule($ACE)
            Set-Acl -Path $path -AclObject $ACL
            Log "Script" "Ajout de la permission [$Grant] sur l'objet [$Object] pour l'identite [$Identity] sur l'OU [$($OU.Substring(3,$OU.Length-3).Split(',')[0])]" 3 Yellow
            Log "Delegation" "Perform : $Identity; $ActiveDirectoryRights; $AccessControlType; $Object; $InheritanceType; $InheritedObject;$OU " 4 Yellow
        
        }else{
            Log "Script" "Whatif - Ajout de le permission [$Grant] sur l'objet [$Object] pour l'identite [$Identity] sur l'OU [$($OU.Substring(3,$OU.Length-3).Split(',')[0])]" 3 Gray
            
        } 
        
       
    }
    catch
    {
        if($returnError){throw $_}else{
            Log "Script" "Try : $Identity; $ActiveDirectoryRights; $AccessControlType; $Object; $InheritanceType; $InheritedObject;$OU " 0 Red
            Log "Script" "Error Message :$($_.Exception.Message)" 0 Red
            Get-DebugError $_ 2
        }
        
    }
}

function Get-AllObjectTypeTab ()
{
   

    if ( [string]::IsNullOrEmpty($RessourceDomain_DNSName)){
        $Server = (Get-ADDomain).DNSRoot
        
    }else{
        $Server = $Global:RessourceDomain_DNSName
    }
    Write-host "Getting Object from : $Server" -f Yellow
    
    $ADRootDSE=(Get-ADRootDSE -Server $Server)
    
    $AllObjectTypeGUID = @{}
    $AllObjectTypeName = @{}
    $GetADObjectParameter = @{
        SearchBase = $ADRootDSE.SchemaNamingContext
        LDAPFilter ='(SchemaIDGUID=*)'
        Properties=@("SchemaIDGUID","Name")
    }
    $SchGUID = Get-ADObject @GetADObjectParameter -Server $Server
    Foreach ($SchemaItem in $SchGUID)
    {
        try
        { 
            $AllObjectTypeGUID.Add($SchemaItem.Name,[GUID]$SchemaItem.SchemaIDGUID)
            $AllObjectTypeName.Add([GUID]$SchemaItem.SchemaIDGUID,$SchemaItem.Name)
        }
        catch
        { 
            continue
        }
    }
    $ADObjExtPar = @{
        SearchBase="CN=Extended-Rights,$($ADRootDSE.ConfigurationNamingContext)"
        LDAPFilter='(ObjectClass=ControlAccessRight)'
        Properties=@("RightsGUID","Name")
    }
    $SchExtGUID = Get-ADObject @ADObjExtPar -Server $Server
    ForEach ($SchExtItem in $SchExtGUID) 
    {
        try
        { 
            $AllObjectTypeGUID.Add($SchExtItem.Name,[GUID]$SchExtItem.RightsGUID) 
            $AllObjectTypeName.Add([GUID]$SchExtItem.RightsGUID,$SchExtItem.Name)
        }
        catch
        { 
            continue
        }
    }
    $AllObjectTypeGUID.Add("All",[guid]"00000000-0000-0000-0000-000000000000")
    $AllObjectTypeName.Add([guid]"00000000-0000-0000-0000-000000000000","All")

    return $AllObjectTypeGUID,$AllObjectTypeName
}
Function Set-ADDelegation_CreateGPO ()
{
    param (
        [Parameter(Mandatory=$true)][string]$Group,
        [Parameter(Mandatory=$false)][switch]$Remove = $false,
        [Parameter(Mandatory=$false)][switch]$RemoveUnknown = $false,
        [Parameter(Mandatory=$true)][string]$Domain
)
$dm = ($Domain.split("."))[0]

# Initialise les objets GPM
$GPM = New-Object -ComObject GPMgmt.GPM
$Constants = $GPM.GetConstants()

    


# Initialise le domaine
$GPMDomain = $GPM.GetDomain($Domain, "", $Constants.UseAnyDC)
$GPMSOM = $GPMDomain.GetSOM("")
$GPMSecInfo = $GPMSOM.GetSecurityInfo()

if ($RemoveUnknown) {
    try {
        for ($i = 1; $i -lt $GPMSecInfo.Count; $i++) {
            $itm=	$GPMSecInfo.Item($i)            
            if ($null -eq $itm.Trustee.TrusteeDSPath -and $itm.Trustee.TrusteeDomain -eq "$dm"){
                $GPMSecInfo.Remove($itm)
                $GPMSOM.SetSecurityInfo($GPMSecInfo)
                Log "Script" "Removed '$($itm.Trustee.TrusteeName)' from having GPO creation rights." 1 Cyan
            }
        }
    } catch {
        Log "Error" "Error removing '$($itm.Trustee.TrusteeName)' from having GPO creation rights : $($_.Exception.Message)" 1 Red
        Get-DebugError $_            
        return -1
    }
   
}


if ($Remove) {
    $exit = 2
    # Supprime les droits de création de GPO pour le groupe
    try {
        $GPMSecInfo.RemoveTrustee("$dm\$Group")
        $GPMSOM.SetSecurityInfo($GPMSecInfo)
        Log "Script" "Removed '$dm\$Group' from having GPO creation rights." 1 Cyan
    } catch {
        Log "Error" "Error removing '$dm\$Group' from having GPO creation rights : $($_.Exception.Message)" 1 Red
        Get-DebugError $_
        $exit = 6
    }
    finally {
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($GPM) | Out-Null
        Remove-Variable -Name GPM -Force
    }
    return $exit
}

# Ajoute les droits de création de GPO pour le groupe
try {
    $exit = 3
    $sid = (Get-ADGroup $Group -Server $domain).SID
    
    $GPMSecInfo.Add($GPM.CreatePermission($sid, $Constants.PermSOMGPOCreate, $false))
    $GPMSecInfo.Add($GPM.CreatePermission($sid, $Constants.PermSOMWMICreate, $false))
    $GPMSOM.SetSecurityInfo($GPMSecInfo)
    Log "Script" "Added '$dm\$Group' as having GPO eand Filter WMI creation rights in $Domain." 1 Cyan
} catch {
    Log "Error" "Error adding GPO creation rights for '$dm\$Group' : $($_.Exception.Message)" 1 Red
    Log "Error" "For WMI in Ressource Domain, you need to modify in ADSI Default Naming Context > CN=SOM,CN=WMIPolicy,CN=System,DC=$dm..." 1 Red
    Log "Error" "And add FullControl to $dm\Administrator" 1 Red

    Get-DebugError $_
    $exit = 7
}finally {
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($GPM) | Out-Null
    Remove-Variable -Name GPM -Force
}
return $exit

}
Function Deny-EveryoneObjectChild ()
{
    Param (
    [Parameter(Mandatory)][string]$OUPath,
    [string]$Inheritance = 'All',
    [string[]]$ExceptObject,
    [string[]]$JustObject,
    [string[]]$denyRight = @("CreateChild", "DeleteChild"),
    $Server = $Global:RessourceDomain_DNSName,
    [switch]$whatIf = $false
    )
    $ObjectsUser = "inetOrgPerson","Contact","User"
    $ObjectsGroup = "Group"
    $ObjectsComputers = "Computer"
    $ObjectsSvc = "ms-DS-Managed-Service-Account","ms-DS-Group-Managed-Service-Account"
    $ObjectsAutres = "Volume","ms-Imaging-PSPs","Print-Queue","ms-DS-Shadow-Principal-Container","MSMQ-Group","MSMQ-Custom-Recipient"

    $ObjectsExchange = "ms-Exch-Dynamic-Distribution-List"

    if ([string]::IsNullOrEmpty($JustObject))
    {
        if ($AllObjectTypeName.Values -contains $ObjectsExchange)
        {
            $ObjectToDeny =  $ObjectsUser,$ObjectsGroup,$ObjectsComputers,$ObjectsSvc,$ObjectsAutres,$ObjectsExchange
        }else{
            $ObjectToDeny =  $ObjectsUser,$ObjectsGroup,$ObjectsComputers,$ObjectsSvc,$ObjectsAutres
        }        
    }elseif ($JustObject.ToLower() -eq "all"){
        $ObjectToDeny =  "All"
    }else{
        $ObjectToDeny =  $JustObject
    }
    

    foreach ($objs in $ObjectToDeny)
    {
        foreach ($obj in $objs)
        {
            if ($ExceptObject -notcontains $obj)
            {
                Set-ADDelegation -Server $Server -OU $OUPath  -Identity "Everyone" -Grant Deny -Inheritance $Inheritance -Object $obj -InheritedObject All -ActiveDirectoryRight $denyRight -whatIf:$WhatIf
            }
        }
    }
}


$ObjectTypeToStringVar = @{
    "00000000-0000-0000-0000-000000000000" = "All";
    "bf967aba-0de6-11d0-a285-00aa003049e2" = "User";
    "bf967a86-0de6-11d0-a285-00aa003049e2" = "Computer";
    "bf967a9c-0de6-11d0-a285-00aa003049e2" = "Group";
    "bf9679c0-0de6-11d0-a285-00aa003049e2" = "member";
    "5cb41ed0-0e4c-11d0-a286-00aa003049e2" = "Contact";
    "7b8b558a-93a5-4af7-adca-c017e67f1057" = "GroupManagedServiceAccount";
    "ce206244-5827-4a86-ba1c-1c0c386c1b64" = "ManagedServiceAccount";
    "bf967aa5-0de6-11d0-a285-00aa003049e2" = "OrganizationalUnit";
    "f30e3bbf-9ff0-11d1-b603-0000f80367c1" = "GP-Options";    
    "f30e3bbe-9ff0-11d1-b603-0000f80367c1" = "GP-Link";
    "b7b1b3de-ab09-4242-9e30-9980e5d322f7" = "Generate-RSoP-Logging";
    "b7b1b3dd-ab09-4242-9e30-9980e5d322f7" = "Generate-RSoP-Planning";
}



$AllActiveDirectoryRights = [System.DirectoryServices.ActiveDirectoryRights].GetEnumValues()
$AllActiveDirectorySecurityInheritance = [System.DirectoryServices.ActiveDirectorySecurityInheritance].GetEnumValues()
$AllAccessControlType = [System.Security.AccessControl.AccessControlType].GetEnumValues()

$WellKnowDomainGroup = @{
    
"Domain Admins"               = "-512"
"Domain Users"                = "-513"
"Domain Guests"               = "-514"
"Domain Computers"            = "-515"
"Domain Controllers"          = "-516"
"Schema Admins"               = "-518"
"Enterprise Admins"           = "-519"
"Group Policy Creator Owners" = "-520"

"Account Operators"                       = "S-1-5-32-548"
"Backup Operators"                        = "S-1-5-32-551"
"Print Operators"                         = "S-1-5-32-550"
"Replicator"                              = "S-1-5-32-552"
"Enterprise Read-Only Domain Controllers" = "S-1-5-32-554"
"Read-Only Domain Controllers"            = "S-1-5-32-555"

}

$WellKnowDomainGrouptovar = @{
"S-1-5-32-548" = "Account Operators" 
"S-1-5-32-551" = "Backup Operators" 
"S-1-5-32-550" = "Print Operators" 
"S-1-5-32-552" = "Replicator" 
"S-1-5-32-554" = "Enterprise Read-Only Domain Controllers" 
"S-1-5-32-555" = "Read-Only Domain Controllers" 
}

#region XML OrgUnit possibility
<#
    Name          =  MonOU                                      =>  Texte libre : Prend en charge les parametres [monparam] 
    Description   = "Contient les groupes de task [Provider]"   =>  Texte libre : Prend en charge les parametres [monparam] 
#>
#endregion OrgUnit possibility

#region XML Delegation possibility
<#
    ACLGroup                = Deny 		|	CreateGPO   			                                    =>  if identity, only Deny possible else Texte libre : (Group ACL from JSON) doit correspondre à un nom, non sensible a la case

if identity: 
	Identity                = Everyone 	|    NA(null)							                        =>  if identity, Defaut Null
	Inheritance             = All 	    |  Descendents	|        None					                =>  if identity, Defaut All
	OUObject                = Users 	|    Computer	|    ServiceAccount	  | ServiceAccountOnly  	=>  if identity, Defaut NA = only OrgUnit
else
	DelegateGroup           = AllTiers_Task_Manage_GPO		                    =>  Texte libre : Prend en charge les parametres [monparam] (n'est pas utilisé si Identity est positionné)
	DelegateGroupPath       = "OU=Tasks,OU=__Delegation"	    	            =>  Texte libre : Prend en charge les parametres [monparam] (n'est pas utilisé si Identity est positionné)
	DelegateGroupDescription = "Groupe de delegation pour le site [Provider]"    =>  Texte libre : Prend en charge les parametres [monparam] (n'est pas utilisé si Identity est positionné)
	Roles                   = "_AllTiers_Role_Create_GPO"                       =>  Texte libre : Prend en charge les parametres [monparam] (n'est pas utilisé si Identity est positionné)
	RolesGroupPath          = "OU=Roles,__Delegation"                           =>  Texte libre : Prend en charge les parametres [monparam] (n'est pas utilisé si Identity est positionné)
    RolesGroupDescription   = "Groupe de delegation pour le site [Provider]"    =>  Texte libre : Prend en charge les parametres [monparam] (n'est pas utilisé si Identity est positionné)
#>
#endregion Delegation possibility
