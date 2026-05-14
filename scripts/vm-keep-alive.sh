#!/bin/bash
# Mantém a VM Oracle ativa gerando CPU por ~5 minutos.
# Oracle desativa VMs Always Free com CPU < 10% por 7 dias consecutivos.
# Cron: 0 3 */3 * *  (00h03 a cada 3 dias)

LOG_FILE="/var/log/vm-keep-alive.log"
DURATION=300  # segundos (5 min)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

log "=== keep-alive iniciado (duração: ${DURATION}s) ==="

END=$((SECONDS + DURATION))
ITER=0

while [ $SECONDS -lt $END ]; do
    # Gera carga de CPU calculando hashes — sem I/O excessivo
    dd if=/dev/urandom bs=1M count=4 2>/dev/null | sha256sum > /dev/null
    ITER=$((ITER + 1))
done

log "=== keep-alive concluído — ${ITER} iterações ==="
