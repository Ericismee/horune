param(
  [Parameter(Mandatory = $true)]
  [string]$ProcessName,
  [ValidateRange(10, 600)]
  [int]$Seconds = 60,
  [ValidateRange(100, 5000)]
  [int]$IntervalMilliseconds = 1000
)

$sampleCount = [Math]::Ceiling(($Seconds * 1000) / $IntervalMilliseconds)
$logicalProcessors = [Environment]::ProcessorCount
$samples = @()
$previousCpu = $null
$previousTimestamp = $null

for ($index = 0; $index -lt $sampleCount; $index++) {
  $process = Get-Process -Name $ProcessName -ErrorAction Stop | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
  $timestamp = Get-Date
  $cpuPercent = $null

  if ($null -ne $previousCpu) {
    $elapsed = ($timestamp - $previousTimestamp).TotalSeconds
    if ($elapsed -gt 0) {
      $cpuPercent = (($process.CPU - $previousCpu) / $elapsed / $logicalProcessors) * 100
    }
  }

  $samples += [PSCustomObject]@{
    Timestamp = $timestamp.ToString('o')
    CpuPercent = if ($null -eq $cpuPercent) { $null } else { [Math]::Round($cpuPercent, 2) }
    WorkingSetMiB = [Math]::Round($process.WorkingSet64 / 1MB, 2)
    PrivateMemoryMiB = [Math]::Round($process.PrivateMemorySize64 / 1MB, 2)
  }

  $previousCpu = $process.CPU
  $previousTimestamp = $timestamp
  Start-Sleep -Milliseconds $IntervalMilliseconds
}

$samples | Format-Table -AutoSize

$cpuSamples = $samples.CpuPercent | Where-Object { $null -ne $_ } | Sort-Object
$medianCpu = if ($cpuSamples.Count -eq 0) { $null } else { $cpuSamples[[Math]::Floor($cpuSamples.Count / 2)] }

[PSCustomObject]@{
  Process = $ProcessName
  DurationSeconds = $Seconds
  LogicalProcessors = $logicalProcessors
  MedianCpuPercent = $medianCpu
  PeakWorkingSetMiB = ($samples.WorkingSetMiB | Measure-Object -Maximum).Maximum
  PeakPrivateMemoryMiB = ($samples.PrivateMemoryMiB | Measure-Object -Maximum).Maximum
} | Format-List
