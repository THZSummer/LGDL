#!/usr/bin/env pwsh
# SDDU Plugin Installer (PowerShell)
# 
# 一键安装脚本 - 自动完成从构建到安装的全部流程
#
# 使用方式:
#   powershell -ExecutionPolicy Bypass -File install.ps1 <TargetDir>
#   or: ./install.ps1 <TargetDir>
#
# 执行步骤:
#   [1/8] 检查源码 (package.json 存在性)
#   [2/8] 清理并重新构建 (clean + npm install + build agents + build TS + package)
#   [3/8] 定位 SDDU 分发文件 (dist/sddu/)
#   [4/8] 创建目标目录 (.opencode/, .sddu/ 等)
#   [5/8] 复制插件文件到目标项目
#   [6/8] 版本检测
#   [7/8] 配置 opencode.json
#   [8/8] 初始化 SDDU 工作空间目录
#
# 注意：必须使用 PowerShell 运行

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetDir
)

$TargetDir = $TargetDir.TrimEnd('\').TrimEnd('/')  # Remove trailing slash to avoid double-slash in paths

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistSdduDir = Join-Path $ScriptDir "dist/sddu"
$DistSdduArchive = Join-Path $ScriptDir "dist/sddu.zip"

Write-Host ""
Write-Host "=== SDDU Plugin Installer ===" -ForegroundColor Cyan
Write-Host "Source: $ScriptDir" 
Write-Host "Target: $TargetDir"
Write-Host ""

# Welcome message for clean SDDU installation
Write-Host "[INFO] SDDU Plugin Installation" -ForegroundColor Cyan
Write-Host "Installing SDDU plugin with latest features" -ForegroundColor Green
Write-Host "Using @sddu-* commands for improved functionality" -ForegroundColor Green
Write-Host ""

# Total steps for complete build and installation
$TOTAL_STEPS = 8

# Step 1: Check source
Write-Host "[1/${TOTAL_STEPS}] Checking source..." -ForegroundColor Cyan
$PackageJsonPath = Join-Path $ScriptDir "package.json"
if (-not (Test-Path $PackageJsonPath)) {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Source validated" -ForegroundColor Green

# Step 2: Clean and rebuild from source
Write-Host "[2/${TOTAL_STEPS}] Cleaning and rebuilding from source..." -ForegroundColor Cyan

# Clean
Write-Host "  Cleaning dist directory..." -ForegroundColor Gray
if (Test-Path (Join-Path $ScriptDir "dist")) {
    Remove-Item -Path (Join-Path $ScriptDir "dist") -Recurse -Force
}

# Install dependencies
Write-Host "  Installing dependencies..." -ForegroundColor Gray
& npm install --prefix $ScriptDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "Install failed" -ForegroundColor Red
    exit 1
}

# Build agents
Write-Host "  Building agents..." -ForegroundColor Gray
& node "$ScriptDir\build-agents.cjs"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Agent build failed" -ForegroundColor Red
    exit 1
}

# Build TypeScript
Write-Host "  Building TypeScript..." -ForegroundColor Gray
& "$ScriptDir\node_modules\.bin\tsc.cmd" --project "$ScriptDir\tsconfig.json"
if ($LASTEXITCODE -ne 0) {
    Write-Host "TS build failed" -ForegroundColor Red
    exit 1
}

# Package
Write-Host "  Packaging..." -ForegroundColor Gray
& node "$ScriptDir\scripts\package.cjs"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Package failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Build complete, using latest code" -ForegroundColor Green
Write-Host ""

# Step 3: Locate SDDU distribution files
Write-Host "[3/${TOTAL_STEPS}] Locating SDDU distribution files..." -ForegroundColor Cyan

if (Test-Path $DistSdduDir) {
    Write-Host "[OK] Using SDDU pre-built distribution in dist/sddu/" -ForegroundColor Green
}
else {
    Write-Host "[INFO] SDDU pre-built distribution not found, checking for archives..." -ForegroundColor Yellow
    if (Test-Path $DistSdduArchive) {
        Write-Host "[INFO] SDDU archive found at $DistSdduArchive, extracting..." -ForegroundColor Green
        $tmpExtractDir = Join-Path $ScriptDir "dist\tmp_extract_sddu"
        Expand-Archive -Path $DistSdduArchive -DestinationPath $tmpExtractDir -Force
        
        # Move extracted sddu directory
        $extractedSddu = Join-Path $tmpExtractDir "sddu"
        if (Test-Path $extractedSddu) {
            Move-Item -Path $extractedSddu -Destination $DistSdduDir -Force
        }
        
        Remove-Item -Path $tmpExtractDir -Recurse -Force
        Write-Host "[OK] SDDU archive extracted to dist/sddu/" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] No SDDU pre-built distributions found, building from source..." -ForegroundColor Yellow
        Write-Host "Building from source..." -ForegroundColor Cyan
        
        # Build agents
        Write-Host "  Building agents..." -ForegroundColor Gray
        & node "$ScriptDir\build-agents.cjs"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Agent build failed" -ForegroundColor Red
            exit 1
        }

        # Build TypeScript
        if (Test-Path (Join-Path $ScriptDir "node_modules")) {
            Write-Host "  Building TypeScript..." -ForegroundColor Gray
            & "$ScriptDir\node_modules\.bin\tsc.cmd" --project "$ScriptDir\tsconfig.json"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "TS build failed" -ForegroundColor Red
                exit 1
            }
        }
        else {
            Write-Host "  Installing dependencies..." -ForegroundColor Gray
            & npm install --prefix $ScriptDir
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Install failed" -ForegroundColor Red
                exit 1
            }
            & "$ScriptDir\node_modules\.bin\tsc.cmd" --project "$ScriptDir\tsconfig.json"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "TS build failed" -ForegroundColor Red
                exit 1
            }
        }

        # Run package script
        Write-Host "  Creating SDDU distribution package..." -ForegroundColor Gray
        & node "$ScriptDir\scripts\package.cjs"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Package creation failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "[OK] Build complete, SDDU distribution package created" -ForegroundColor Green
    }
}

# Step 4: Create SDDU directories
Write-Host "[4/${TOTAL_STEPS}] Creating SDDU directories..." -ForegroundColor Cyan

$directories = @(
    "$TargetDir\.opencode\plugins\sddu",
    "$TargetDir\.opencode\agents",
    "$TargetDir\.sddu",
    "$TargetDir\.sddu\specs-tree-root"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "[INFO] Path exists: $dir" -ForegroundColor Yellow
    } else {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "[OK] Created: $dir" -ForegroundColor Green
    }
}

# Step 5: Copy SDDU plugins
Write-Host "[5/${TOTAL_STEPS}] Copying SDDU plugins from distribution directory..." -ForegroundColor Cyan

$SdduPluginDest = Join-Path $TargetDir ".opencode\plugins\sddu"

function Copy-DistributionToPlugin {
    param([string]$SourceDir, [string]$DestDir, [string]$VersionLabel)
    
    if (Test-Path $SourceDir) {
        Write-Host "  Copying $VersionLabel plugin from $SourceDir..." -ForegroundColor Cyan
        
        # Remove destination if exists
        if (Test-Path $DestDir) { Remove-Item -Path $DestDir -Recurse -Force }
        
        # Create destination directory
        $parentDir = Split-Path $DestDir -Parent
        if (-not (Test-Path $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }
        
        # Copy everything from source to destination
        Copy-Item -Path "$SourceDir\*" -Destination $DestDir -Recurse
        $fileCount = (Get-ChildItem -Path $DestDir -Recurse | Where-Object {!$_.PSIsContainer} | Measure-Object).Count
        Write-Host "[OK] Copied $fileCount $VersionLabel plugin files" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[INFO] $VersionLabel plugin source not found: $SourceDir" -ForegroundColor Yellow
        return $false
    }
}

# Copy SDDU version only
if (-not (Copy-DistributionToPlugin -SourceDir $DistSdduDir -DestDir $SdduPluginDest -VersionLabel "SDDU")) {
    Write-Host "FATAL: SDDU plugin source not available. Cannot proceed." -ForegroundColor Red
    exit 1
}

# Clean old SDDU/SDD agent files (only sddu-* and sdd-*, don't touch other plugins' agents)
$agentsDir = Join-Path $TargetDir ".opencode\agents"
if (Test-Path $agentsDir) {
    $oldAgents = Get-ChildItem -Path $agentsDir -File | Where-Object { $_.Name -like "sddu-*" -or $_.Name -like "sdd-*" }
    if ($oldAgents.Count -gt 0) {
        Write-Host "[CLEANUP] Removing $($oldAgents.Count) old SDDU/SDD agent files..." -ForegroundColor Yellow
        $oldAgents | Remove-Item -Force
        Write-Host "[OK] Old SDDU/SDD agents cleaned" -ForegroundColor Green
    }
}

# Copy agents from SDDU source to .opencode/agents/
if (Test-Path (Join-Path $DistSdduDir "agents")) {
    Write-Host "  Copying SDDU agents from dist/sddu/agents/..." -ForegroundColor Gray
    Copy-Item -Path (Join-Path $DistSdduDir "agents\*") -Destination (Join-Path $TargetDir ".opencode\agents\") -Recurse -Force
}

# Count agents copied (only .md files are agent definitions)
$AgentCount = (Get-ChildItem -Path (Join-Path $TargetDir ".opencode\agents") -Filter "*.md" -File | Measure-Object).Count
Write-Host "[OK] Total agents copied: $AgentCount" -ForegroundColor Green


# Step 6: Version Detection
Write-Host "[6/${TOTAL_STEPS}] Version Detection..." -ForegroundColor Cyan

# Get source version from SDDU directory
$SourcePkgPath = Join-Path $DistSdduDir "package.json"

if (Test-Path $SourcePkgPath) {
    try {
        $pkg = Get-Content $SourcePkgPath -Raw | ConvertFrom-Json
        $SourceVersion = $pkg.version
    }
    catch {
        $SourceVersion = "unknown"
    }
}
else {
    # Fallback: Get version from original source package.json
    $SourcePkgPathFallback = Join-Path $ScriptDir "package.json"
    if (Test-Path $SourcePkgPathFallback) {
        try {
            $pkg = Get-Content $SourcePkgPathFallback -Raw | ConvertFrom-Json
            $SourceVersion = $pkg.version
        }
        catch {
            $SourceVersion = "unknown"
        }
    }
    else {
        $SourceVersion = "unknown"
    }
}

Write-Host "[INFO] Source package version: $SourceVersion" -ForegroundColor Green

# Step 7: Configure SDDU opencode.json
Write-Host "[7/${TOTAL_STEPS}] Configuring SDDU opencode.json..." -ForegroundColor Cyan

$OpencodeSourceSddu = Join-Path $ScriptDir "dist/sddu/opencode.json"

# Ensure .opencode directory exists
$OpencodeDir = Join-Path $TargetDir ".opencode"
if (-not (Test-Path $OpencodeDir)) {
    New-Item -ItemType Directory -Path $OpencodeDir -Force | Out-Null
}

$OpencodeDestPath = Join-Path $OpencodeDir "opencode.json"

# 迁移：如果新路径不存在但老路径（项目根目录）存在，先迁移过来
$OldOpencodeJsonPath = Join-Path $TargetDir "opencode.json"
if (-not (Test-Path $OpencodeDestPath) -and (Test-Path $OldOpencodeJsonPath)) {
    Write-Host "[MIGRATE] 发现旧版 opencode.json 在项目根目录，迁移到 .opencode/" -ForegroundColor Yellow
    Copy-Item $OldOpencodeJsonPath $OpencodeDestPath
    Write-Host "[OK] 已迁移到 .opencode/opencode.json，原文件保留为备份" -ForegroundColor Green
}

# Verify SDDU configuration exists
if (-not (Test-Path $OpencodeSourceSddu)) {
    Write-Host "ERROR: SDDU opencode.json not found at $OpencodeSourceSddu" -ForegroundColor Red
    Write-Host "Please run 'npm run build' or 'node scripts/package.cjs' first" -ForegroundColor Yellow
    exit 1
}

if (Test-Path $OpencodeDestPath) {
    Write-Host "[CONFIG UPDATE]" -ForegroundColor Cyan
    Write-Host "✅ Existing opencode.json found, updating to SDDU format" -ForegroundColor Green
    
    try {
        # Read existing and new configs
        $existingConfig = Get-Content $OpencodeDestPath -Raw | ConvertFrom-Json
        $newConfig = Get-Content $OpencodeSourceSddu -Raw | ConvertFrom-Json
        
        # Create backup
        Copy-Item -Path $OpencodeDestPath -Destination "$OpencodeDestPath.backup" -Force
        
        # Merge plugin arrays: preserve user's existing plugins, add SDDU, remove old SDD
        $existingPlugins = @()
        if ($existingConfig.plugin) { $existingPlugins = @($existingConfig.plugin) }
        $newPlugins = @()
        if ($newConfig.plugin) { $newPlugins = @($newConfig.plugin) }
        $userPlugins = $existingPlugins | Where-Object { $_ -ne 'opencode-sdd-plugin' -and $_ -ne 'opencode-sddu-plugin' }
        $mergedPlugins = ($newPlugins + $userPlugins) | Select-Object -Unique
        $existingConfig.plugin = $mergedPlugins
        
        # Merge SDDU agent definitions (preserve user's custom agents and model overrides)
        $existingAgentHash = @{}
        if ($existingConfig.agent) {
            foreach ($p in $existingConfig.agent.PSObject.Properties) {
                $existingAgentHash[$p.Name] = $p.Value
            }
        }
        $newAgentHash = @{}
        foreach ($p in $newConfig.agent.PSObject.Properties) {
            $newAgentHash[$p.Name] = $p.Value
        }
        
        $updatedCount = 0
        $modelPreserved = 0
        
        # Update/add SDDU agents (preserve user's model if customized)
        foreach ($key in @($newAgentHash.Keys | Where-Object { $_ -like 'sddu*' })) {
            if ($existingAgentHash.ContainsKey($key) -and $existingAgentHash[$key].model) {
                # Deep copy new agent and preserve user's model
                $merged = $newAgentHash[$key] | ConvertTo-Json -Depth 5 -Compress | ConvertFrom-Json
                $merged.model = $existingAgentHash[$key].model
                $existingAgentHash[$key] = $merged
                $modelPreserved++
            } else {
                $existingAgentHash[$key] = $newAgentHash[$key]
            }
            $updatedCount++
        }
        
        # Remove old SDD agent entries (sdd-* without 'u')
        foreach ($key in @($existingAgentHash.Keys | Where-Object { $_ -like 'sdd-*' -or $_ -eq 'sdd' })) {
            $existingAgentHash.Remove($key)
        }
        
        # Rebuild agent as PSCustomObject
        $agentPSC = [PSCustomObject]@{}
        foreach ($key in $existingAgentHash.Keys) {
            $agentPSC | Add-Member -MemberType NoteProperty -Name $key -Value $existingAgentHash[$key]
        }
        $existingConfig.agent = $agentPSC
        
        # Merge permissions: SDDU required permissions take precedence, user's custom permissions preserved
        $existingConfig.permission = @{}
        foreach ($key in $newConfig.permission.PSObject.Properties.Name) {
            $existingConfig.permission[$key] = $newConfig.permission[$key]
        }
        foreach ($key in $existingConfigOld.permission.PSObject.Properties.Name) {
            if (-not $existingConfig.permission.ContainsKey($key)) {
                $existingConfig.permission[$key] = $existingConfigOld.permission[$key]
            }
        }
        
        # Update schema
        if ($newConfig.'$schema') {
            $existingConfig.'$schema' = $newConfig.'$schema'
        }
        
        # Write updated config
        $existingConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $OpencodeDestPath
        
        $agentsTotal = $existingAgentHash.Count
        $userPreserved = @($existingAgentHash.Keys | Where-Object { $_ -notlike 'sddu*' }).Count
        Write-Host "✅ Plugins updated: SDDU plugin configured" -ForegroundColor Green
        Write-Host "✅ SDDU agents updated: $updatedCount" -ForegroundColor Green
        if ($modelPreserved -gt 0) {
            Write-Host "✅ User model overrides preserved: $modelPreserved" -ForegroundColor Green
        }
        if ($userPreserved -gt 0) {
            Write-Host "✅ User custom agents preserved: $userPreserved" -ForegroundColor Green
        }
        Write-Host "✅ Total agents: $agentsTotal" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARN] Config update failed, copying SDDU config and backing up original" -ForegroundColor Yellow
        Copy-Item -Path $OpencodeDestPath -Destination "$OpencodeDestPath.failed_backup" -Force
        Copy-Item -Path $OpencodeSourceSddu -Destination $OpencodeDestPath -Force
        Write-Host "[OK] Copied new SDDU opencode.json (original backed up as .failed_backup)" -ForegroundColor Green
    }
}
else {
    Write-Host "ℹ️  No existing opencode.json, creating new SDDU config" -ForegroundColor Cyan
    Copy-Item -Path $OpencodeSourceSddu -Destination $OpencodeDestPath -Force
    Write-Host "[OK] Created new SDDU opencode.json" -ForegroundColor Green
}

# Step 8: Initialize SDDU workspace directory
Write-Host "[8/${TOTAL_STEPS}] Initializing SDDU workspace directory..." -ForegroundColor Cyan

Write-Host "[OK] .sddu/ directories ready" -ForegroundColor Green

# Calculate final counts
$SdduFileCount = (Get-ChildItem -Path $SdduPluginDest -Recurse | Where-Object {!$_.PSIsContainer} | Measure-Object).Count

Write-Host ""
Write-Host "=== SDDU Installation Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Installed to: $TargetDir"
Write-Host ""
Write-Host "Files:" -ForegroundColor White
Write-Host "  - .opencode/plugins/sddu/ ($SdduFileCount files from SDDU dist/)" -ForegroundColor White
Write-Host "  - .opencode/agents/ ($AgentCount agents total)" -ForegroundColor White
Write-Host "  - .opencode/plugins/sddu/templates/output/ (output templates)" -ForegroundColor White
Write-Host "  - .opencode/opencode.json (plugin configuration - SDDU standard)" -ForegroundColor White
Write-Host "  - .sddu/ (workspace container)" -ForegroundColor White
Write-Host ""
Write-Host "  🚀 v3.0.0: 8-Stage Workflow + Two-Field State Model" -ForegroundColor Yellow
Write-Host ""
Write-Host "Agents installed ($AgentCount total):" -ForegroundColor Cyan
Write-Host "  SDDU Standard Agents:" -ForegroundColor White
Write-Host "    @sddu              - Smart entry point"
Write-Host "    @sddu-discovery    - Requirement Discovery"
Write-Host "    @sddu-spec         - Specification"
Write-Host "    @sddu-plan         - Technical Planning"
Write-Host "    @sddu-tasks        - Task Breakdown"
Write-Host "    @sddu-build        - Implementation"
Write-Host "    @sddu-review       - Code Review"
Write-Host "    @sddu-validate     - Validation"
Write-Host "    @sddu-roadmap      - Roadmap planning"
Write-Host "    @sddu-tree         - Directory navigation (TREE generator)"
Write-Host "    @sddu-docs         - Project panorama generation"
Write-Host "    @sddu-fast         - Quick mode (stateless, lightweight tasks)"
Write-Host ""
Write-Host "Quick Start:" -ForegroundColor Cyan
Write-Host "  cd '$TargetDir'"
Write-Host "  opencode"
Write-Host "  @sddu start [feature name]"
Write-Host "  @sddu-discovery [topic]" 
Write-Host ""
Write-Host "SDDU Features:" -ForegroundColor Cyan
Write-Host "  - Eight-stage workflow (registered → discovered → specified → planned → tasked → builded → reviewed → validated)"
Write-Host "  - Two-field state model: phase (8 values) + status (5 values: tracked/completed/suspended/terminated/merged)"
Write-Host "  - 6-zone dashboard with @sddu status"
Write-Host "  - R5 consistency checker for automatic state repair"
Write-Host ""
Write-Host ""
Write-Host "✅ Installation complete. Ready to start your requirements discovery with SDDU!" -ForegroundColor Green
Write-Host ""
