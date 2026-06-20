# 低空无人机飞行审批系统

一套完整的低空无人机飞行审批管理平台，涵盖**空域申请、风险评估、现场报备、轨迹归档**四大核心业务流程。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | Vue 3 + TypeScript + Vite |
| UI组件 | Element Plus + @element-plus/icons-vue |
| 地图 | OpenLayers 8 (OSM底图 + GeoJSON 渲染) |
| 状态管理 | Pinia |
| 后端 | NestJS 10 + TypeScript |
| 数据库 | PostgreSQL 15 + PostGIS 3.4 (空间索引) |
| 缓存 | Redis 7 (禁飞区查询缓存 TTL 600s) |
| 认证 | JWT + Passport + bcrypt |
| 权限 | RBAC (operator/air_traffic/police/admin) |
| API文档 | Swagger / OpenAPI |

## 系统角色与权限

| 角色 | 账号 | 密码 | 权限 |
|------|------|------|------|
| 系统管理员 | admin | 123456 | 全部模块管理权限 |
| 运营公司 | operator | 123456 | 提交飞行计划、报备起降、上传轨迹与作业结果 |
| 空管协同人员 | airtraffic | 123456 | 空域审核、禁飞区管理、轨迹复核与归档 |
| 公安人员 | police | 123456 | 大型活动风险评估与公安审批 |

## 核心业务流程

```
运营公司提交飞行计划
        ↓
   [禁飞区穿越检测] -- 冲突 → 驳回
        ↓ 通过
空管协同人员审核 (检查空域冲突)
        ↓
公安人员风险评估 (检查大型活动)
        ↓
   批准 / 驳回
        ↓ (批准后)
起飞报备 (未报备 → 禁止上传作业结果)
        ↓
降落报备
        ↓
上传实际轨迹 + 作业结果
        ↓
   [轨迹偏离检测] >200米 → 标记偏离
        ↓
   复核 (空管) / 正常
        ↓
       归档
```

## 关键业务规则

1. **穿越禁飞区不能批准**：提交飞行计划时自动调用 PostGIS `ST_Intersects` 检测航线与禁飞区的冲突，存在冲突则拒绝提交。
2. **未完成起飞报备不能上传作业结果**：后端在 `uploadOperationResult()` 中校验 `status >= TAKEOFF_REPORTED`。
3. **实际轨迹偏离计划自动标记**：使用 PostGIS `ST_Distance(geography)` 计算实际航点到计划航线的球面距离，最大偏离超过 200 米时标记为"已偏离"并进入复核流程。
4. **大型活动风险检查**：公安审批时根据 `ST_Buffer(area, radius)` + 时间段重叠判断飞行计划是否靠近活动现场。

## 项目结构

```
1248/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── common/          # 公共枚举、装饰器、守卫
│   │   ├── modules/
│   │   │   ├── auth/        # 认证 (JWT + Passport)
│   │   │   ├── user/        # 用户管理 + 种子数据
│   │   │   ├── airspace/    # 空域/禁飞区 CRUD + PostGIS 冲突检测 + Redis 缓存
│   │   │   ├── flight-plan/ # 飞行计划 + 审批状态机
│   │   │   ├── risk-assessment/ # 大型活动风险评估
│   │   │   ├── report/      # 起飞/降落报备 + 作业结果
│   │   │   └── trajectory/  # 轨迹归档 + 偏离检测 + 复核
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env
│   └── Dockerfile
├── frontend/                # Vue 3 前端
│   ├── src/
│   │   ├── components/      # OpenLayersMap 通用地图组件
│   │   ├── views/           # 各业务页面
│   │   ├── stores/          # Pinia
│   │   ├── router/          # Vue Router + 角色守卫
│   │   └── api/             # Axios 封装
│   ├── nginx.conf
│   └── Dockerfile
├── docker/
│   └── postgis/             # PostGIS 初始化脚本
└── docker-compose.yml
```

## 快速启动

### 方式一：Docker Compose (推荐)

一键启动所有服务（PostGIS、Redis、后端、前端）：

```bash
docker compose up -d --build
```

启动后访问：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000
- Swagger 文档：http://localhost:3000/api

### 方式二：本地开发

**前置依赖**：Node.js 18+、PostgreSQL 15+PostGIS、Redis 7

```bash
# 1. 配置数据库 (PostgreSQL)
psql -U postgres
> CREATE DATABASE uav_approval;
> \c uav_approval
> CREATE EXTENSION postgis;

# 2. 启动后端
cd backend
npm install
cp .env.example .env      # 编辑数据库和 Redis 连接
npm run start:dev

# 3. 启动前端 (新开终端)
cd ../frontend
npm install
npm run dev
```

## 主要 API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/login | 登录获取 Token |
| POST | /auth/register | 注册用户 |
| GET | /auth/profile | 获取当前用户信息 |

### 空域管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /airspace | 空域列表 (Redis 缓存禁飞区) |
| POST | /airspace | 新增空域 |
| GET | /airspace/no-fly-zones | 获取全部禁飞区 (缓存) |
| POST | /airspace/check-conflict | 航线禁飞区冲突检测 |

### 飞行计划
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /flight-plans | 计划列表 (按角色过滤) |
| POST | /flight-plans | 创建计划 |
| POST | /flight-plans/:id/submit | 提交审核 (自动检测禁飞区) |
| POST | /flight-plans/:id/air-traffic-review | 空管审核 |
| POST | /flight-plans/:id/police-review | 公安风险评估 |

### 现场报备
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /reports | 报备列表 |
| POST | /reports/:planId/takeoff | 起飞报备 |
| POST | /reports/:planId/landing | 降落报备 |
| POST | /reports/:planId/upload-result | 上传作业结果 |

### 轨迹归档
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /trajectories | 轨迹列表 |
| GET | /trajectories/:id | 轨迹详情 (含偏离点) |
| POST | /trajectories/:planId/upload | 上传轨迹 (自动偏离检测) |
| POST | /trajectories/:id/start-review | 发起复核 |
| POST | /trajectories/:id/review-approve | 复核通过 |
| POST | /trajectories/:id/review-reject | 复核驳回 |
| POST | /trajectories/:id/archive | 归档 |

## 空间数据说明

- **坐标系**：存储与传输使用 WGS84 (EPSG:4326)，前端 OpenLayers 使用 Web Mercator (EPSG:3857) 渲染。
- **PostGIS 空间索引**：所有 geometry 字段均建有 GIST 空间索引。
- **偏离算法**：实际轨迹拆分为航点 → `ST_Distance(point::geography, line::geography)` 计算到计划航线的球面距离（米）→ 取 MAX / AVG / TOP 10 偏离点。
