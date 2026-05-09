# Envia vm-keep-alive.sh para a VM Oracle e configura o cron.
# Uso: .\scripts\setup-vm-keep-alive.ps1
# Requer: alias 'oracle-ctrl-custos' configurado em ~/.ssh/config

$SSH  = "oracle-ctrl-custos"
$SCRIPT_LOCAL  = "$PSScriptRoot\vm-keep-alive.sh"
$SCRIPT_REMOTE = "/home/ubuntu/vm-keep-alive.sh"

Write-Host ">>> Enviando script para a VM..."
scp $SCRIPT_LOCAL "${SSH}:${SCRIPT_REMOTE}"
if (-not $?) { Write-Error "scp falhou"; exit 1 }

Write-Host ">>> Configurando permissoes e movendo para /usr/local/bin..."
ssh $SSH @"
sudo mv $SCRIPT_REMOTE /usr/local/bin/vm-keep-alive.sh
sudo chmod +x /usr/local/bin/vm-keep-alive.sh
sudo touch /var/log/vm-keep-alive.log
sudo chmod 644 /var/log/vm-keep-alive.log
echo 'Script instalado em /usr/local/bin/vm-keep-alive.sh'
"@

Write-Host ">>> Adicionando cron (root) - executa 00h03 a cada 3 dias..."
ssh $SSH @"
CRON_LINE='3 0 */3 * * root /usr/local/bin/vm-keep-alive.sh'
CRON_FILE='/etc/cron.d/vm-keep-alive'
echo "`` `$CRON_LINE``" | sudo tee `$CRON_FILE > /dev/null
sudo chmod 644 `$CRON_FILE
echo 'Cron configurado em ' `$CRON_FILE
cat `$CRON_FILE
"@

Write-Host ">>> Teste rapido (executa o script agora em background - leva ~5 min)..."
$run_test = Read-Host "Rodar teste agora? (s/N)"
if ($run_test -eq 's' -or $run_test -eq 'S') {
    ssh $SSH "sudo nohup /usr/local/bin/vm-keep-alive.sh &"
    Write-Host "Script rodando em background. Para acompanhar: ssh $SSH 'tail -f /var/log/vm-keep-alive.log'"
}

Write-Host "`n=== Configuracao concluida ==="
Write-Host "Para ver o log na VM:  ssh $SSH 'tail -20 /var/log/vm-keep-alive.log'"
Write-Host "Para ver o cron:       ssh $SSH 'cat /etc/cron.d/vm-keep-alive'"
