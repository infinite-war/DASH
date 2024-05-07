param ( $interfaceName = "WLAN",
        $limit1 = 2000000,  # 2Mbps in bits
        $limit2 = 6000000,  # 6Mbps in bits
        $duration = 60      # 切换时间间隔
)

# 定义初始带宽限制规则
New-NetQosPolicy -Name "MyQoS" -AppPathNameMatchCondition "Any" -ThrottleRateActionBitsPerSecond $limit1


# 带宽限制为1000kbps
Set-NetQosPolicy -Name "MyQoS" -ThrottleRateActionBitsPerSecond $limit2
Write-Host "switch to 6mbps"
Start-Sleep -Seconds $duration

