#!/usr/bin/env bash
# SDDU Plugin Installer (Linux/macOS)
# 
# 一键安装脚本 - 自动完成从构建到安装的全部流程
#
# 使用方式:
#   bash install.sh <TargetDir>
#   or: ./install.sh <TargetDir>
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
# 注意：必须使用 bash 运行，不能使用 sh

# Detect if running with sh instead of bash
if [ -z "$BASH_VERSION" ]; then
    echo "ERROR: This script requires bash."
    echo ""
    echo "You ran it with 'sh', but it must be run with 'bash':"
    echo ""
    echo "  bash install.sh <TargetDir>"
    echo "  # or"
    echo "  ./install.sh <TargetDir>"
    echo ""
    exit 1
fi

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# Helper function for colored output
print_color() {
    printf "%b\n" "$1"
}

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get target directory from command line argument
if [ -z "$1" ]; then
    print_color "${RED}ERROR: Target directory required${NC}"
    echo ""
    echo "Usage: bash install.sh <TargetDir>"
    echo "   or: ./install.sh <TargetDir>"
    echo ""
    echo "Note: This script requires bash. Do NOT run with 'sh install.sh'"
    echo ""
    exit 1
fi

TARGET_DIR="${1%/}"  # Remove trailing slash to avoid double-slash in paths

echo ""
print_color "${CYAN}=== SDDU Plugin Installer ===${NC}"
print_color "Source: ${SCRIPT_DIR}"
print_color "Target: ${TARGET_DIR}"
echo ""

# Welcome message for clean SDDU installation
print_color "${CYAN}[INFO] SDDU Plugin Installation${NC}"
print_color "${GREEN}Installing SDDU plugin with latest features${NC}"
print_color "${GREEN}Using @sddu-* commands for improved functionality${NC}"
echo ""

# Total steps for complete build and installation
TOTAL_STEPS=8

# Step 1: Check source
print_color "${CYAN}[1/${TOTAL_STEPS}] Checking source...${NC}"
if [ ! -f "${SCRIPT_DIR}/package.json" ]; then
    print_color "${RED}ERROR: package.json not found${NC}"
    exit 1
fi
print_color "${GREEN}[OK] Source validated${NC}"

# Step 2: Clean and rebuild from source
print_color "${CYAN}[2/${TOTAL_STEPS}] Cleaning and rebuilding from source...${NC}"

# Clean
print_color "${GRAY}  Cleaning dist directory...${NC}"
rm -rf "${SCRIPT_DIR}/dist"
if [ $? -ne 0 ]; then
    print_color "${RED}Clean failed${NC}"
    exit 1
fi

# Install dependencies
print_color "${GRAY}  Installing dependencies...${NC}"
npm install --prefix "${SCRIPT_DIR}"
if [ $? -ne 0 ]; then
    print_color "${RED}Install failed${NC}"
    exit 1
fi

# Build agents
print_color "${GRAY}  Building agents...${NC}"
node "${SCRIPT_DIR}/scripts/build-agents.cjs"
if [ $? -ne 0 ]; then
    print_color "${RED}Agent build failed${NC}"
    exit 1
fi

# Build TypeScript
print_color "${GRAY}  Building TypeScript...${NC}"
"${SCRIPT_DIR}/node_modules/.bin/tsc" --project "${SCRIPT_DIR}/tsconfig.json"
if [ $? -ne 0 ]; then
    print_color "${RED}TS build failed${NC}"
    exit 1
fi

# Package
print_color "${GRAY}  Packaging...${NC}"
node "${SCRIPT_DIR}/scripts/package.cjs"
if [ $? -ne 0 ]; then
    print_color "${RED}Package failed${NC}"
    exit 1
fi

print_color "${GREEN}[OK] Build complete, using latest code${NC}"
echo ""

# Step 3: Check for prebuilt dist/sddu directory
print_color "${CYAN}[3/${TOTAL_STEPS}] Locating SDDU distribution files...${NC}"

DIST_SDDU_DIR="${SCRIPT_DIR}/dist/sddu"
DIST_SDDU_ARCHIVE="${SCRIPT_DIR}/dist/sddu.zip"

if [ -d "$DIST_SDDU_DIR" ]; then
    print_color "${GREEN}[OK] Using SDDU pre-built distribution in dist/sddu/${NC}"
else
    print_color "${YELLOW}[INFO] SDDU pre-built distribution not found, checking for archives...${NC}"
    if [ -f "$DIST_SDDU_ARCHIVE" ]; then
        print_color "${GREEN}[INFO] SDDU archive found at $DIST_SDDU_ARCHIVE, unpacking...${NC}"
        mkdir -p "${SCRIPT_DIR}/dist/sddu"
        unzip -q "${DIST_SDDU_ARCHIVE}" -d "${SCRIPT_DIR}/dist/tmp_extract_sddu"
        mv "${SCRIPT_DIR}/dist/tmp_extract_sddu/sddu" "${SCRIPT_DIR}/dist/sddu" 2>/dev/null || \
        mv "${SCRIPT_DIR}/dist/tmp_extract_sddu/sdd" "${SCRIPT_DIR}/dist/sddu"  # In case archive has different name
        rm -r "${SCRIPT_DIR}/dist/tmp_extract_sddu" 2>/dev/null || true
        print_color "${GREEN}[OK] SDDU archive extracted to dist/sddu/${NC}"
    else
        print_color "${YELLOW}[WARN] No SDDU pre-built distributions found, building from source...${NC}"
        print_color "${CYAN}Building from source...${NC}"
        
        # Build agents
        print_color "${GRAY}  Building agents...${NC}"
        node "${SCRIPT_DIR}/scripts/build-agents.cjs"
        if [ $? -ne 0 ]; then
            print_color "${RED}Agent build failed${NC}"
            exit 1
        fi

        # Build TypeScript
        if [ -d "${SCRIPT_DIR}/node_modules" ]; then
            print_color "${GRAY}  Building TypeScript...${NC}"
            "${SCRIPT_DIR}/node_modules/.bin/tsc" --project "${SCRIPT_DIR}/tsconfig.json"
            if [ $? -ne 0 ]; then
                print_color "${RED}TS build failed${NC}"
                exit 1
            fi
        else
            print_color "${GRAY}  Installing dependencies...${NC}"
            npm install --prefix "${SCRIPT_DIR}"
            if [ $? -ne 0 ]; then
                print_color "${RED}Install failed${NC}"
                exit 1
            fi
            "${SCRIPT_DIR}/node_modules/.bin/tsc" --project "${SCRIPT_DIR}/tsconfig.json"
            if [ $? -ne 0 ]; then
                print_color "${RED}TS build failed${NC}"
                exit 1
            fi
        fi

        # Now run the packaging script to create the sddu distribution package
        print_color "${GRAY}  Creating SDDU distribution package...${NC}"
        node "${SCRIPT_DIR}/scripts/package.cjs"
        if [ $? -ne 0 ]; then
            print_color "${RED}Package creation failed${NC}"
            exit 1
        fi
        
        print_color "${GREEN}[OK] Build complete, SDDU distribution package created${NC}"
    fi
fi

# Step 4: Create directories
print_color "${CYAN}[4/${TOTAL_STEPS}] Creating SDDU directories...${NC}"

# Support only SDDU directory structure for new installations
for dir in "${TARGET_DIR}/.opencode/plugins/sddu" "${TARGET_DIR}/.opencode/agents" "${TARGET_DIR}/.sddu" "${TARGET_DIR}/.sddu/specs-tree-root" "${TARGET_DIR}/.sddu/skills"; do
    if [ -d "$dir" ]; then
        print_color "${YELLOW}[INFO] Path exists: $dir${NC}"
    else
        mkdir -p "$dir"
        print_color "${GREEN}[OK] Created: $dir${NC}"
    fi
done

# Step 5: Copy SDDU plugins only (includes .opencode/plugins/sddu/skills/ framework Skills)
print_color "${CYAN}[5/${TOTAL_STEPS}] Copying SDDU plugins from distribution directory...${NC}"
SDDU_PLUGIN_DEST="${TARGET_DIR}/.opencode/plugins/sddu"

copy_distribution_to_plugin() {
    local source_dir="$1"
    local dest_dir="$2"
    local version_label="$3"
    
    if [ -d "$source_dir" ]; then
        print_color "${CYAN}  Copying ${version_label} plugin from ${source_dir}...${NC}"
        # Clean destination first
        if [ -d "$dest_dir" ]; then
            rm -rf "$dest_dir"
        fi
        mkdir -p "$dest_dir"
        
        # Copy the entire source directory contents
        cp -r "$source_dir/"* "$dest_dir/"
        
        count=$(find "$dest_dir" -type f | wc -l)
        print_color "${GREEN}[OK] Copied $count ${version_label} plugin files${NC}"
        return 0
    else
        print_color "${YELLOW}[INFO] ${version_label} plugin source not found: $source_dir${NC}"
        return 1
    fi
}

# Copy SDDU version
if ! copy_distribution_to_plugin "${SCRIPT_DIR}/dist/sddu" "$SDDU_PLUGIN_DEST" "SDDU"; then
    print_color "${RED}FATAL: SDDU plugin source not available. Cannot proceed.${NC}"
    exit 1
fi

# Copy agents from source to .opencode/agents/ - only SDDU agents
if [ -d "${SCRIPT_DIR}/dist/sddu/agents" ]; then
    print_color "${GRAY}  Copying SDDU agents from dist/sddu/agents/...${NC}"
    # Clean old SDDU/SDD agent files (only sddu-* and sdd-*, don't touch other plugins' agents)
    if [ -d "${TARGET_DIR}/.opencode/agents" ]; then
        OLD_AGENTS=$(find "${TARGET_DIR}/.opencode/agents" -maxdepth 1 \( -name "sddu-*" -o -name "sdd-*" \) -type f 2>/dev/null | wc -l)
        if [ "$OLD_AGENTS" -gt 0 ]; then
            print_color "${YELLOW}[CLEANUP] Removing ${OLD_AGENTS} old SDDU/SDD agent files...${NC}"
            rm -f "${TARGET_DIR}/.opencode/agents/sddu-"* "${TARGET_DIR}/.opencode/agents/sdd-"*
            print_color "${GREEN}[OK] Old SDDU/SDD agents cleaned${NC}"
        fi
    fi
    cp "${SCRIPT_DIR}/dist/sddu/agents/"* "${TARGET_DIR}/.opencode/agents/" 2>/dev/null || print_color "${GRAY}  SDDU agents not found, continuing...${NC}"
fi

# Count agents copied (only .md files are agent definitions)
AGENT_COUNT=$(find "${TARGET_DIR}/.opencode/agents" -name "*.md" -type f | wc -l)
print_color "${GREEN}[OK] Total agents copied: $AGENT_COUNT${NC}"

# Step 6: Version Detection
print_color "${CYAN}[6/${TOTAL_STEPS}] Version Detection...${NC}"

# Get source version from SDDU directory
SOURCE_PKG_PATH="${SCRIPT_DIR}/dist/sddu/package.json"

if [ -f "$SOURCE_PKG_PATH" ]; then
    SOURCE_VERSION=$(node -p "require('$SOURCE_PKG_PATH').version" 2>/dev/null || echo "")
    if [ -z "$SOURCE_VERSION" ]; then
        SOURCE_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$SOURCE_PKG_PATH" | cut -d'"' -f4)
    fi
else
    # Fallback: Get version from original source package.json
    SOURCE_PKG_PATH_FOR_VERSION="${SCRIPT_DIR}/package.json"
    SOURCE_VERSION=$(node -p "require('$SOURCE_PKG_PATH_FOR_VERSION').version" 2>/dev/null || echo "")
    if [ -z "$SOURCE_VERSION" ]; then
        SOURCE_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$SOURCE_PKG_PATH_FOR_VERSION" | cut -d'"' -f4)
    fi
fi

print_color "${GREEN}[INFO] Source package version: $SOURCE_VERSION${NC}"

# Step 7: Apply opencode.json with new configurations
print_color "${CYAN}[7/${TOTAL_STEPS}] Configuring SDDU opencode.json...${NC}"

# Prepare SDDU configuration file
OPENCODE_JSON_SOURCE_SDDU="${SCRIPT_DIR}/dist/sddu/opencode.json"

# Verify SDDU configuration exists
if [ ! -f "$OPENCODE_JSON_SOURCE_SDDU" ]; then
    print_color "${RED}ERROR: SDDU opencode.json not found at $OPENCODE_JSON_SOURCE_SDDU${NC}"
    print_color "${YELLOW}Please run 'npm run build' or 'node scripts/package.cjs' first${NC}"
    exit 1
fi

mkdir -p "${TARGET_DIR}/.opencode"
OPENCODE_JSON_PATH="${TARGET_DIR}/.opencode/opencode.json"
OLD_OPENCODE_JSON_PATH="${TARGET_DIR}/opencode.json"

# 迁移：如果新路径不存在但老路径（项目根目录）存在，先迁移过来
if [ ! -f "$OPENCODE_JSON_PATH" ] && [ -f "$OLD_OPENCODE_JSON_PATH" ]; then
    print_color "${YELLOW}[MIGRATE] 发现旧版 opencode.json 在项目根目录，迁移到 .opencode/${NC}"
    cp "$OLD_OPENCODE_JSON_PATH" "$OPENCODE_JSON_PATH"
    print_color "${GREEN}[OK] 已迁移到 .opencode/opencode.json，原文件保留为备份${NC}"
fi

if [ -f "$OPENCODE_JSON_PATH" ]; then
    print_color "${CYAN}[CONFIG UPDATE]${NC}"
    print_color "${GREEN}✅ Existing opencode.json found, updating to SDDU format${NC}"
    
    # Update configuration to use SDDU format (keeping existing custom agents if needed but updating plugin definitions and core agent configurations)
    if node -e "
const fs = require('fs');
try {
    // Read existing and new configs
    const existingConfig = JSON.parse(fs.readFileSync('${OPENCODE_JSON_PATH}', 'utf-8'));
    const newConfig = JSON.parse(fs.readFileSync('${OPENCODE_JSON_SOURCE_SDDU}', 'utf-8'));
    
    // Create backup
    fs.writeFileSync('${OPENCODE_JSON_PATH}.backup', JSON.stringify(existingConfig, null, 2));
    
    // Merge plugin arrays: preserve user's existing plugins, add SDDU, remove old SDD
    const existingPlugins = Array.isArray(existingConfig.plugin) ? existingConfig.plugin : [];
    const newPlugins = Array.isArray(newConfig.plugin) ? newConfig.plugin : [];
    const userPlugins = existingPlugins.filter(p => p !== 'opencode-sdd-plugin' && p !== 'opencode-sddu-plugin');
    existingConfig.plugin = [...new Set([...newPlugins, ...userPlugins])];
    
    // Merge SDDU agent definitions (preserve user's custom agents and model overrides)
    if (!existingConfig.agent) {
        existingConfig.agent = {};
    }
    const sdduAgentKeys = Object.keys(newConfig.agent || {}).filter(k => k.startsWith('sddu') || k === 'sddu');
    let updatedCount = 0;
    let modelPreserved = 0;
    for (const key of sdduAgentKeys) {
        const newAgent = newConfig.agent[key];
        const oldAgent = existingConfig.agent[key];
        if (oldAgent && oldAgent.model) {
            // User has customized the model — keep it, update everything else
            existingConfig.agent[key] = { ...newAgent, model: oldAgent.model };
            modelPreserved++;
        } else {
            existingConfig.agent[key] = newAgent;
        }
        updatedCount++;
    }
    // Remove old SDD agent entries (sdd-* without 'u') if present
    for (const key of Object.keys(existingConfig.agent)) {
        if (key.startsWith('sdd-') || key === 'sdd') {
            delete existingConfig.agent[key];
            console.log('REMOVED_OLD_AGENT:' + key);
        }
    }
    
    // Merge permissions: SDDU required permissions take precedence, user's custom permissions preserved
    existingConfig.permission = { ...existingConfig.permission, ...newConfig.permission };
    
    // Maintain schema from new config 
    if (newConfig.\$schema) {
        existingConfig.\$schema = newConfig.\$schema;
    }
    
    // Write updated config
    fs.writeFileSync('${OPENCODE_JSON_PATH}', JSON.stringify(existingConfig, null, 2));
    
    // Count changes
    const allAgents = Object.keys(existingConfig.agent || {});
    const userAgents = allAgents.filter(k => !k.startsWith('sddu') && k !== 'sddu');
    console.log('PLUGINS_UPDATED_SDDU:1');
    console.log('AGENTS_TOTAL:' + allAgents.length);
    console.log('SDDU_UPDATED:' + updatedCount);
    console.log('MODEL_PRESERVED:' + modelPreserved);
    console.log('USER_PRESERVED:' + userAgents.length);
    
} catch (error) {
    console.error('UPDATE_ERROR:', error.message);
    process.exit(1);
}
" > /tmp/sddu_update_result.txt 2>/dev/null; then
    
        # Extract results from the output
        PLUGINS_UPDATED=$(grep "PLUGINS_UPDATED_SDDU:" /tmp/sddu_update_result.txt | cut -d':' -f2)
        AGENTS_TOTAL=$(grep "AGENTS_TOTAL:" /tmp/sddu_update_result.txt | cut -d':' -f2)
        SDDU_UPDATED=$(grep "SDDU_UPDATED:" /tmp/sddu_update_result.txt | cut -d':' -f2)
        MODEL_PRESERVED=$(grep "MODEL_PRESERVED:" /tmp/sddu_update_result.txt | cut -d':' -f2)
        USER_PRESERVED=$(grep "USER_PRESERVED:" /tmp/sddu_update_result.txt | cut -d':' -f2)
        
        print_color "${GREEN}✅ Plugins updated: SDDU plugin configured${NC}"
        print_color "${GREEN}✅ SDDU agents updated: ${SDDU_UPDATED}${NC}"
        if [ "${MODEL_PRESERVED}" -gt 0 ] 2>/dev/null; then
            print_color "${GREEN}✅ User model overrides preserved: ${MODEL_PRESERVED}${NC}"
        fi
        if [ "${USER_PRESERVED}" -gt 0 ] 2>/dev/null; then
            print_color "${GREEN}✅ User custom agents preserved: ${USER_PRESERVED}${NC}"
        fi
        print_color "${GREEN}✅ Total agents: ${AGENTS_TOTAL}${NC}"
    
    else
        # If update fails, backup original and copy new SDDU config
        print_color "${YELLOW}[WARN] Config update failed, copying SDDU config and backing up original${NC}"
        cp "${OPENCODE_JSON_PATH}" "${OPENCODE_JSON_PATH}.failed_backup"
        cp "${OPENCODE_JSON_SOURCE_SDDU}" "${OPENCODE_JSON_PATH}"
        print_color "${GREEN}[OK] Copied new SDDU opencode.json (original backed up as .failed_backup)${NC}"
    fi

else
    # No existing file - just copy with SDDU config as primary
    print_color "${CYAN}ℹ️  No existing opencode.json, creating new SDDU config${NC}"
    cp "${OPENCODE_JSON_SOURCE_SDDU}" "${OPENCODE_JSON_PATH}"
    print_color "${GREEN}[OK] Created new SDDU opencode.json${NC}"
fi
# Step 8: Initialize .sddu/ directory structure
print_color "${CYAN}[8/${TOTAL_STEPS}] Initializing SDDU workspace directory...${NC}"

print_color "${GREEN}[OK] .sddu/ directories ready${NC}"

# 提示用户运行 sddu-skill-sync 同步 Skills
print_color "${CYAN}[INFO] SDDU Skills 需要在首次使用前同步到实际目录${NC}"
print_color "${YELLOW}👉 在 OpenCode 中运行以下命令同步 SDDU Skills：${NC}"
echo "    @sddu 同步 SDDU Skills"
echo ""
print_color "${GREEN}[OK] 提示：SDDU Skills（发现/创建/同步）安装完成，使用前请先同步${NC}"

# Done
echo ""
print_color "${GREEN}=== SDDU Installation Complete ===${NC}"
echo ""
print_color "Installed to: ${TARGET_DIR}"
echo ""
echo "Files:"
echo "  - .opencode/plugins/sddu/ ($([ -d ${TARGET_DIR}/.opencode/plugins/sddu ] && find ${TARGET_DIR}/.opencode/plugins/sddu -type f | wc -l || echo 0) files from SDDU dist/)"
echo "  - .opencode/agents/ ($AGENT_COUNT agents total)"
echo "  - .opencode/opencode.json (plugin configuration - SDDU standard)"
echo "  - .sddu/ (workspace container)"
echo ""
echo "  🚀 New Feature: 8-Stage Workflow is now available!"
print_color "${CYAN}Agents installed ($AGENT_COUNT total):${NC}"
echo "  SDDU Standard Agents:"
echo "    @sddu              - Smart entry point"
echo "    @sddu-discovery    - Requirement Discovery"
echo "    @sddu-spec         - Specification"
echo "    @sddu-plan         - Technical Planning"
echo "    @sddu-tasks        - Task Breakdown"
echo "    @sddu-build        - Implementation"
echo "    @sddu-review       - Code Review"
echo "    @sddu-validate     - Validation"
echo "    @sddu-roadmap      - Roadmap planning"
echo "    @sddu-tree         - Directory navigation (TREE generator)"
echo "    @sddu-docs         - Project panorama generation"
echo "    @sddu-fast         - Quick mode (stateless, lightweight tasks)"
echo ""
print_color "${CYAN}Quick Start:${NC}"
echo "  cd '${TARGET_DIR}'"
echo "  opencode"
echo "  @sddu start [feature name]"
echo "  @sddu-discovery [topic]" 
echo ""
print_color "${CYAN}SDDU Features:${NC}"
echo "  - Eight-stage workflow (registered → discovered → specified → planned → tasked → builded → reviewed → validated)"
echo "  - Improved architecture with standardized naming"
echo "  - Enhanced documentation maintenance"
echo ""
print_color "✅ Installation complete. Ready to start your requirements discovery with SDDU!"
echo ""