!macro customInit
  ${ifNot} ${isUpdated}
    nsExec::Exec '"$LOCALAPPDATA\vtt_desktop_client\Update.exe" --uninstall -s'
    delete "$LOCALAPPDATA\vtt_desktop_client\Update.exe"
    delete "$LOCALAPPDATA\vtt_desktop_client\.dead"
    rmDir "$LOCALAPPDATA\vtt_desktop_client"
    ; Delete the start menu shortcut
    Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\theripper93\vtt-desktop-client.lnk"
    ; Delete the parent directory if it's not empty (because there's no /r)
    RMDir "$APPDATA\Microsoft\Windows\Start Menu\Programs\theripper93"
  ${endIf}
!macroend