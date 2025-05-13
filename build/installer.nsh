!macro customInit
  ${ifNot} ${isUpdated}
    ; Create uninstall marker if Squirrel app exists
    ${if} ${FileExists} "$LOCALAPPDATA\vtt_desktop_client"
      FileOpen $9 "$LOCALAPPDATA\vtt_desktop_client\.shouldUninstall" w
      FileClose $9
    ${endIf}

    ; Delete the start menu shortcut
    Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\theripper93\vtt-desktop-client.lnk"
    ; Delete the parent directory if it's not empty (because there's no /r)
    RMDir "$APPDATA\Microsoft\Windows\Start Menu\Programs\theripper93"
  ${endIf}
!macroend