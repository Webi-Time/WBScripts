# 🛠️ Configuration JSON

Bienvenue dans la documentation des fichiers de configuration JSON utilisés dans mes scripts PowerShell. Chacun des scripts en possède un, portant <u>le même nom </u>(**Non obligatoire**) que le script et <u>dans le même dossier</u> (**Obligatoire**).  

Ces fichiers JSON permettent de personnaliser divers paramètres, organisés en trois sections principales : **Generic**, **Tenant**, et **Script**. Ces configurations sont essentielles pour ajuster le comportement des script en fonction des besoins spécifiques de l'utilisateur ou de l'environnement dans lequel ils sont exécutés. Ils permettent d'automatiser les tâches tout en offrant un haut degré de personnalisation.

## ⚙️ Generic

La section "Generic" comprend des paramètres génériques pour le script. Elle contient deux éléments :
- **📁 FilesToKeep** : Ce paramètre est défini sur "50" et indique le nombre de fichiers à conserver.
- **💾 SpaceToUseByScriptsMax** : Ce paramètre est défini sur "5MB" et indique l'espace maximum autorisé pour les scripts.

## 🏢 Tenant

La section "Tenant" contient des informations spécifiques au locataire Microsoft. Elle inclut les éléments suivants :
- **🆔 clientId** : Identifiant du client, par exemple, "xxx0e736-xxxx-4488-8699-xxxxxxxxxxxx".
- **🏷️ tenantId** : Identifiant du locataire, par exemple, "xxxxx255-4e75-xxxx-8d64-267xxxxxx242".
- **🔑 clientCertificate** : Empreinte du certificat du client, par exemple, "A0B9FBC8A6D556XXXXXXDBD5EABF5114AF1CE3".
- **🏢 tenantName** : Nom du locataire, par exemple, "m365x12345678.onmicrosoft.com".

## 📜 Script

La section "Script" contient des paramètres spécifiques au script. Elle comporte dans certaint cas les éléments pour l'envoie de mail  :
- **📧 Mail** : Cette sous-section concerne les paramètres liés à l'envoi d'e-mails. Elle contient les éléments suivants :
  - **📝 TemplatePath** :  Chemin vers le modèle d'e-mail à utiliser, par exemple, "MailBitlocker.html" ou ".\\\\MailBitlocker.html". (Les anti-slashs doivent être doublés dans le chemin.)
  - **✉️ FromMail** : Adresse e-mail de l'expéditeur, par exemple, "security.scripts@m365x12345678.onmicrosoft.com".
  - **📨 ToMail** : Adresse e-mail du destinataire, par exemple, "MyEmailAdress@domain.com".

⚠️ **Attention** : La section **Script** contient des paramètres spécifiques à chaque script, qui peuvent varier en fonction des besoins du script en question. Ces paramètres spécifiques seront détaillés individuellement dans la documentation de chaque script.
