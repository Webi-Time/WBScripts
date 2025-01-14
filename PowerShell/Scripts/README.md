
# Collection de scripts PowerShell
Ce document regroupe une collection de scripts classés par catégories pour faciliter la gestion, la configuration, la création et la maintenance des environnements informatiques.



# 🛠️ Configuration

## ⚙️ Active Directory

## ⚙️ Hyper-V




# 🛠️ Création

## 🏢 Active Directory


## 💻 Hyper-V


## 📂 Autres




## 🛡️ Maintenance et Contrôle Opérationnel (MCO/MCS)

## 🌐 Active Directory Domain Services

### 🔑 Gestion des Objets AD
- **[Repair-WBADObjectsOwner.ps1](/PowerShell/Scripts/Repair-WBADObjectsOwner/Repair-WBADObjectsOwner.ps1)** : Corrige les propriétaires incorrects des objets dans Active Directory. [Read More](/PowerShell/Documentation/Repair-WBADObjectsOwner/ReadMe.md)
- **[Repair-WBADSysvolFilesOwner.ps1](/PowerShell/Scripts/Repair-WBADSysvolFilesOwner/Repair-WBADSysvolFilesOwner.ps1)** : Répare les permissions et les propriétaires des fichiers dans le dossier SYSVOL. [Read More](/PowerShell/Documentation/Repair-WBADSysvolFilesOwner/ReadMe.md) 

### 💾 Sauvegarde

### 🚨 Gestion des Alertes

### 👤 Gestion des Comptes
- **[Add-CompagnyUsers.ps1](/PowerShell/Scripts/Add-CompagnyUsers/Add-CompagnyUsers.ps1)** : Créer des utilisateurs dans Active Directory a l'aide d'un fichier CSV. [Read More](/PowerShell/Documentation/Add-CompagnyUsers/ReadMe.md) 

- **[Check-WBDisabledUsersTime.ps1](/PowerShell/Scripts/Check-WBDisabledUsersTime/Check-WBDisabledUsersTime.ps1)** : Ce script vérifie les utilisateurs désactivés dans Active Directory pour générer un rapport sur les utilisateurs désactivés depuis longtemps ou ceux sans informations de désactivation [Read More](/PowerShell/Documentation/Check-WBDisabledUsersTime/ReadMe.md)

- **[Disable-WBInactiveUsers.ps1](/PowerShell/Scripts/Disable-WBInactiveUsers/Disable-WBInactiveUsers.ps1)** : Vérifie et désactive automatiquement les utilisateurs dans Active Directory en fonction de critères tels que l'expiration des mots de passe ou l'inactivité. [Read More](/PowerShell/Documentation/Disable-WBInactiveUsers/ReadMe.md) 

### 🔒 Sécurité
- **[Run-WBPingCastle.ps1](/PowerShell/Scripts/Run-WBPingCastle/Run-WBPingCastle.ps1)** : Automatisation des analyses PingCastle pour détecter et corriger les vulnérabilités de sécurité dans Active Directory. [Read More](/PowerShell/Documentation/Run-WBPingCastle/ReadMe.md)
- **[Check-BitLocker.ps1](/PowerShell/Scripts/Check-BitLocker/Check-BitLocker.ps1)** : Vérifie l'état de BitLocker sur les ordinateurs. [Read More](/PowerShell/Documentation/Check-BitLocker/ReadMe.md)

## 🏢 Active Directory Certificats Services

### 🛡️ Gestion des Certificats
- Automatisation des processus de gestion des certificats pour les services AD CS.

## 🖥️ Windows Servers

### 🛡️ Gestion des Certificats
- Scripts dédiés à la gestion des certificats sur les serveurs Windows pour garantir leur conformité et sécurité.

## ☁️ Azure

### 🛡️ Autre
- **[Start-ConnectTenant.ps1](/PowerShell/Scripts/Start-ConnectTenant/Start-ConnectTenant.ps1)** : Établit et gère la connexion au locataire Microsoft. [Read More](/PowerShell/Documentation/Start-ConnectTenant/ReadMe.md)
- **[Check-AADLastSynchronisation.ps1](/PowerShell/Scripts/Check-AADLastSynchronisation/Check-AADLastSynchronisation.ps1)** : Vérifie la dernière synchronisation Azure AD. [Read More](/PowerShell/Documentation/Check-AADLastSynchronisation/ReadMe.md) 
- **[Check-AzureAppsCredExpiration.ps1](/PowerShell/Scripts/Check-AzureAppsCredExpiration/Check-AzureAppsCredExpiration.ps1)** : Vérifie les dates d'expiration des informations d'identification des applications Azure. [Read More](/PowerShell/Documentation/Check-AzureAppsCredExpiration/ReadMe.md) 
  
- **[.Template-MsGraph.ps1](/PowerShell/Scripts/.Template-MsGraph/.Template-MsGraph.ps1)** : Modèle de script pour interagir avec l'API Microsoft Graph. [Read More](/PowerShell/Documentation/.Template-MsGraph/ReadMe.md) 

- **[Check-MailBoxSize.ps1](/PowerShell/Scripts/Check-MailBoxSize/Check-MailBoxSize.ps1)** : Vérifie la taille des boîtes aux lettres. [Read More](/PowerShell/Documentation/Check-MailBoxSize/ReadMe.md) 

---

Ce guide a pour objectif de centraliser et de simplifier l’accès aux scripts indispensables à l’administration moderne des environnements IT.







