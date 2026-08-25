# Port Master Data và Search Index - CrewPort

Status: DRAFT
Owner: Data Architecture
Reviewers: Maritime Operations Expert, Performance Architect, Frontend Architect, Legal and Compliance Reviewer, QA Lead
Last updated: 2026-08-25

## Purpose

Định nghĩa cách CrewPort xây dựng danh sách cảng biển toàn cầu có thể tìm kiếm nhanh, đủ provenance, có kiểm soát chất lượng và phù hợp với thiết bị di động, mạng yếu và quy mô hàng triệu người dùng.

Tài liệu này là chuẩn ingestion và phân phối dữ liệu. Phase 1 hiện tạo snapshot và search projection tĩnh cho môi trường phát triển; không tạo backend, database hoặc crawler chạy theo request production.

## Scope

- Chuẩn hóa port, alias, quốc gia, thành phố, UN/LOCODE, tọa độ, terminal và gate context.
- Dedupe giữa UN/LOCODE và NGA World Port Index.
- Confidence, provenance, versioning, quarantine và release gate.
- Search projection phân mảnh, phân phối qua CDN và tải dữ liệu theo nhu cầu.
- Phased implementation từ seed cơ bản đến community notes theo context.
- JSON Schema contract nhúng ở cuối tài liệu; seed/search artifacts được tái tạo bằng scripts có kiểm tra integrity.

## Out of scope

- Backend API, database, search vendor hoặc CDN vendor cụ thể.
- Scraping MarineTraffic, VesselFinder hoặc website thương mại không có API/license.
- Map SDK, live AIS, booking, payment, marketplace hoặc dữ liệu liên hệ cá nhân.
- Terminal access, Crew Gate, shore-leave permission hoặc safety claim được suy đoán từ dữ liệu địa lý.
- Community notes, phone links và hoạt động cộng đồng thật trong seed Port Master.

## Trạng thái triển khai Phase 1

- Snapshot UN/LOCODE `2025-1` đã được tải từ artifact chính thức, kiểm checksum và tạo 17.520 candidate có maritime function.
- Snapshot NGA WPI chính thức có 3.807 bản ghi; exact LOCODE join xác nhận 2.833 candidate và một override MPA xác nhận Port of Singapore.
- Search projection công khai hiện có 2.834 cảng thuộc 185 quốc gia/vùng lãnh thổ; 14.686 UN-only candidate được giữ nội bộ để rà soát.
- Client chỉ tải manifest nhỏ và một shard phù hợp với truy vấn; dữ liệu không được đóng vào JavaScript bundle.
- NGA WPI được tải từ FeatureServer công khai chính thức; endpoint CSV chính thức là fallback. Không dùng mirror bên thứ ba để thay thế.
- Attribution được xuất cùng artifact; việc phân phối production vẫn mang trạng thái `pending-production-review` cho đến khi Legal/Compliance khóa điều khoản release.

## Quyết định kiến trúc

### 1. Tách canonical data, search projection và detail context

Không đưa toàn bộ global index vào initial JavaScript bundle và không tải toàn bộ danh sách cảng xuống trình duyệt.

```text
Official snapshots
        ↓
Streaming parse + normalize + validate
        ↓
Canonical Port Master + provenance
        ↓
Compact search projections
        ↓
Immutable CDN shards
        ↓
Browser tải manifest và shard phù hợp
        ↓
Port summary/detail chỉ tải khi cần
```

Port Master là nguồn canonical. Search index là read projection có thể tạo lại hoàn toàn từ canonical data. Port Hub/Port Notes vẫn là read model, không trở thành database entity mới.

### 2. Phân phối Phase 1 bằng CDN shard

Mỗi release xuất các artifact versioned và content-addressed:

```text
/port-master/{datasetVersion}/manifest.json
/port-master/{datasetVersion}/search/{contentHash}.json
/port-master/{datasetVersion}/summary/{contentHash}.json
/port-master/{datasetVersion}/context/{contentHash}.json
```

- `manifest.json` nhỏ, có schema version, dataset version, mapping prefix → shard hash và checksum.
- Search shard chỉ chứa field cần cho kết quả tìm kiếm; không chứa toàn bộ provenance hoặc notes.
- Summary và terminal/gate context tải riêng sau khi chọn kết quả.
- Shard immutable dùng cache dài hạn; manifest có cache ngắn hơn để chuyển release nguyên tử.
- Không đổi dataset giữa chừng một truy vấn. Client pin `datasetVersion` cho session hiện tại.
- Khi manifest mới lỗi hoặc không tải được, client dùng version hợp lệ gần nhất đã cache và thể hiện trạng thái stale khi phù hợp.
- Giữ các version trước để rollback bằng cách đổi manifest pointer, không cần build lại frontend.

CDN giúp tách chi phí phân phối khỏi request search và cho phép hàng triệu người dùng dùng cùng các artifact đã cache. Nếu sau này cần ranking động hoặc community search, `PortRepository` hiện tại vẫn là boundary để thêm adapter API mà không đổi UI.

## Chính sách nguồn dữ liệu

### Thứ tự nguồn

1. [UN/LOCODE](https://unece.org/trade/cefact/UNLOCODE-Download) cho identity, LOCODE, country, location name và function.
2. [NGA World Port Index](https://msi.nga.mil/Publications/WPI) cho WPI Number, alternate name, tọa độ và thuộc tính tham khảo. WPI Number phải được giữ ổn định giữa các release theo [giải thích field chính thức](https://msi.nga.mil/api/publications/download?key=16920959%2FSFH00000%2FWPI_Explanation_of_Data_Fields.pdf&type=view).
3. [OpenStreetMap](https://www.openstreetmap.org/copyright) và OpenSeaMap cho terminal, berth và gate context bổ sung. OSM chịu ODbL và không phải nguồn mặc định cho quyền truy cập cảng.
4. Trang chính thức của port authority hoặc terminal operator cho manual enrichment sau khi có URL, ngày kiểm tra và reviewer.

Thứ tự trên là thứ tự ingestion và vai trò dữ liệu; không có nghĩa một nguồn thắng mọi field. Ví dụ, UN là authority cho identity nhưng tọa độ WPI có thể phù hợp hơn cho port point. Nguồn chính thức của terminal có thể xác nhận context do OSM phát hiện.

UN/LOCODE function `1` chỉ tạo candidate đường thủy. Candidate chỉ được publish khi exact LOCODE xuất hiện trong NGA WPI hoặc có override được reviewer xác nhận bằng trang port authority chính thức. Airport function có thể cùng tồn tại với port function và không phải điều kiện loại trừ độc lập.

### License và provenance gate

Mọi source snapshot phải có `sourceId`, `release`, `sourceUrl`, `termsUrl`, `retrievedAt`, `checksum`, `allowedUse`, `attributionRequired`, `redistributionAllowed` và `reviewStatus`.

- Không promote artifact lên production khi terms của UN hoặc NGA chưa được Legal/Compliance duyệt.
- OSM-derived layer phải có attribution và đánh giá nghĩa vụ ODbL trước khi gộp hoặc phân phối cùng canonical dataset.
- Manual enrichment chỉ lưu structured facts và provenance cần thiết; không sao chép dài nội dung có bản quyền.
- Không ghi nhận nguồn không rõ license vào canonical release.

## Chuẩn canonical data

### PortMasterRecord

| Field | Quy tắc |
|---|---|
| `id` | ID CrewPort bất biến, không suy ra từ tên hoặc tọa độ hiện tại. |
| `canonicalName` | Tên hiển thị gốc từ nguồn identity tốt nhất. |
| `aliases[]` | Giá trị thay thế có ngôn ngữ, loại alias và source reference riêng. |
| `country.code` | ISO 3166-1 alpha-2; phải khớp UN/LOCODE và kiểm tra với WPI. |
| `country.name` | Tên hiển thị theo nguồn đã duyệt. |
| `city` | Nullable; chỉ điền khi nguồn cung cấp rõ ràng, không suy đoán từ port name. |
| `unLocode` | In hoa, dạng liền 5 ký tự, không khoảng trắng. |
| `unLocodeSpaced` | Dạng hiển thị `CC XXX`; chỉ là reading/search aid. |
| `coordinates` | WGS84 decimal, kèm raw value, precision và source reference. |
| `sourceRefs[]` | Lineage của identity và từng enrichment quan trọng. |
| `confidence` | Field/record trust theo enum ở phần Confidence. |
| `lifecycle` | `active`, `deprecated`, `merged`, `needsReview` hoặc `quarantined`. |
| `redirectTo` | ID canonical mới khi record bị merge hoặc đổi identity. |

### Alias normalization

- Giữ nguyên giá trị Unicode để hiển thị và lưu provenance.
- Tạo `normalizedValue` bằng Unicode normalization, lowercase/case folding, bỏ dấu cho key phụ, đổi `đ/Đ` thành `d`, gom punctuation và whitespace.
- Không thay thế tên gốc bằng chuỗi bỏ dấu.
- `NameWoDiacritics`, WPI alternate name và alias chính thức có thể được index; alias OSM phải giữ source role rõ ràng.
- Generic words như `port`, `harbour`, `terminal` chỉ dùng cho search auxiliary key; không xóa khỏi canonical name.

### TerminalContextRecord và GateContextRecord

Terminal và gate là context riêng, không flatten thành fact của port:

- `terminalId`, `portId`, tên, aliases, tọa độ tùy chọn và source refs.
- Gate có `gateId`, `portId`, `terminalId` tùy chọn, tên, loại context và source refs.
- `gateType` có thể là `crew`, `cargo`, `main`, `security`, `unknown`; OSM không được tự gán `crew`.
- Không lưu giờ mở cửa, quyền lên bờ, pickup point hoặc access permission nếu chưa có nguồn vận hành phù hợp.
- Mỗi claim access/safety sau này phải giữ `KnowledgeMeta`/trust riêng và gắn tới terminal/gate cụ thể.

## Dedupe và conflict resolution

### Luồng xử lý

1. Parse từng nguồn thành raw row có `sourceRowId` và source release.
2. Normalize field và loại country header/malformed row theo rule nguồn.
3. Group duplicate UN rows theo canonical LOCODE; giữ biến thể làm aliases có provenance.
4. Group WPI updates theo WPI Number; không tạo record mới chỉ vì tên hoặc tọa độ đổi.
5. Exact join UN–WPI theo `country.code + unLocode`.
6. Dùng blocking theo country, token signature và ô tọa độ lân cận cho WPI không có LOCODE.
7. Tự động link chỉ khi quan hệ là một-một và không có conflict nghiêm trọng.
8. Candidate một-nhiều, conflict hoặc fuzzy match chuyển moderation/data review queue.

### Quy tắc merge

- Cùng LOCODE trong cùng release là một trade location; subordinate/listing rows không trở thành các port riêng.
- Exact LOCODE + cùng country + một UN record và một WPI record: auto-link.
- Nếu lệch trên 25 km và không có canonical/alias tương đồng, đánh dấu `conflicting`, không tự merge.
- WPI không có LOCODE chỉ là candidate khi cùng country, tên/alias tương đồng và khoảng cách ≤10 km; reviewer quyết định.
- Khác country, khác WPI Number hoặc chỉ giống tên không được merge.
- Không dùng khoảng cách đơn độc để merge các port lớn hoặc cluster terminal.
- Mọi giá trị nguồn vẫn giữ trong provenance; canonical value không xóa dữ liệu xung đột.

### Độ phức tạp

- Exact index theo LOCODE/WPI Number: expected `O(n + m)`.
- Candidate matching: `O(n + k)` với `k` là số ứng viên trong block, không phải toàn bộ dataset.
- Tọa độ chỉ tính Haversine sau blocking; không chạy pairwise distance toàn cầu.
- Build lớn dùng partition/external sort khi memory threshold bị vượt; không yêu cầu toàn bộ raw source trong RAM.

## Confidence và data health

Confidence phải giải thích được bằng nguồn, thời điểm và field cụ thể:

| Status | Ý nghĩa |
|---|---|
| `official` | Field được nguồn chính thức phù hợp cung cấp hoặc reviewer xác nhận bằng trang chính thức. |
| `corroborated` | Hai nguồn độc lập phù hợp nhau, không có conflict mở. |
| `supplementary` | Dữ liệu mở như OSM dùng để phát hiện/bổ sung context, chưa là authority. |
| `pending_review` | Có dữ liệu nhưng chưa đủ bằng chứng hoặc chưa được reviewer duyệt. |
| `conflicting` | Các nguồn không thống nhất; không được trình bày như fact chắc chắn. |

Mỗi release sinh data-health report gồm source rows đọc, accepted, duplicate, quarantined, unmatched, conflict, coverage theo country và tỷ lệ field thiếu. Report dùng cho QA/admin, không tải vào first screen.

Public search record phải có `classification` là `wpi-confirmed` hoặc `officially-curated`, cùng WPI Number hoặc source reference của port authority. UN status không tự tạo trust “official port”.

## Search index contract và ranking

Search projection phải có các field sau:

```text
name
nameNormalized
aliases
aliasesNormalized
countryCode
countryName
city
unLocode
unLocodeSpaced
terminalNames
gateNames
portId
slug
confidenceSummary
conflictFlags
classification
wpiNumbers
sourceIds
```

### Sharding

- Mỗi search token được normalize, lấy prefix hai ký tự rồi định tuyến bằng FNV-1a vào 256 bucket ổn định.
- Name, alias, country và LOCODE đều thêm record vào bucket của từng token liên quan; terminal/gate sẽ dùng cùng quy tắc khi Phase 3 được duyệt.
- Manifest lưu bucket, document count, byte size, gzip size và SHA-256 để client chọn token có bucket nhỏ nhất trong query nhiều từ.
- Một query thông thường tải tối đa một search shard; query quá rộng yêu cầu thêm ký tự.
- Record search giữ projection tối thiểu; canonical data và provenance đầy đủ nằm ngoài public search payload.

### Ranking

Thứ tự match cố định:

1. Exact LOCODE liền hoặc có khoảng trắng.
2. Exact canonical name.
3. Exact alias.
4. Prefix canonical name.
5. Prefix alias.
6. Exact/prefix terminal hoặc gate context.
7. City/country.
8. Fuzzy fallback có giới hạn.

Tie-break dùng country match, confidence và alphabetical canonical name. Không dùng lượt xem, lượt click, popularity, social proof hoặc dữ liệu cộng đồng chưa duyệt.

## Performance budget và loading behavior

- Port index không được nằm trong initial JS.
- Manifest: mục tiêu ≤20 KiB Brotli, hard limit ≤40 KiB.
- Search shard: mục tiêu ≤64 KiB Brotli, hard limit ≤128 KiB.
- Kết quả mặc định tối đa 20, hard limit 50.
- Search scoring sau khi shard có sẵn: p95 <50 ms trên thiết bị low-end reference.
- Port summary và detail tải lazy; terminal/gate context không làm tăng first-screen payload.
- Data Saver/Ultra Lite chỉ tải text projection, không tải ảnh, bản đồ, geometry chi tiết hoặc decoration.
- Cache hit không phát sinh request mới cho cùng dataset version và shard hash.
- Bundle gate hiện tại vẫn áp dụng: initial gzip mục tiêu 200 KiB, JavaScript gzip mục tiêu 150 KiB.
- Offline chỉ hỗ trợ shard đã cache hoặc Port Pack đã chọn; không tuyên bố global offline search nếu dữ liệu chưa có trên thiết bị.

## Versioning, refresh và release

- Raw snapshot bất biến; output được tạo lại bằng source release + parser version + schema version.
- Artifact được sort deterministic để cùng input tạo cùng content hash.
- Release mới tạo diff theo source identity, canonical ID, field value và provenance.
- Record bị remove hoặc đổi code trở thành tombstone/redirect, không hard-delete.
- Schema fingerprint thay đổi phải review trước promotion.
- Global accepted-port count giảm trên 2% hoặc một country giảm trên 10% trong cùng classifier version thì chặn release để điều tra. Migration classifier có chủ đích phải có review và baseline mới.
- Release chỉ promote khi license, schema, dedupe, integrity và search golden set đều đạt.
- Manifest pointer đổi atomically; giữ bản release trước để rollback nhanh.

## Phased implementation

### Phase 1 - Seed và search base ports

- Nhập production UN/LOCODE sau license review; chỉ nhập WPI từ endpoint chính thức khi nguồn khả dụng và được duyệt.
- Lọc các row có maritime port function thành candidate theo quy tắc UN/LOCODE.
- Chỉ publish exact UN/LOCODE–WPI match hoặc official override đã review; UN-only và WPI-only giữ trong data-health/canonical layer.
- Tạo PortMasterRecord, exact dedupe, search shard và provenance tối thiểu.
- Search được theo name, alias, country, city, UN/LOCODE; terminal/gate chưa được bịa hoặc suy đoán.

### Phase 2 - Curate top ports

- Product và Maritime Operations chọn 20–30 cảng ưu tiên.
- Review canonical name, aliases, country, city, tọa độ, conflict và search relevance.
- Tạo golden query set từ dữ liệu đã duyệt, không dùng fake activity hoặc popularity.

### Phase 3 - Terminal/gate enrichment

- Trích xuất context OSM/OpenSeaMap theo controlled snapshot, không phụ thuộc live API trong request.
- Đối chiếu với port authority/terminal operator khi cần.
- Gắn source, confidence và pending state cho từng terminal/gate.
- Không suy diễn Crew Gate, shore-leave permission, access hours hoặc pickup point.

### Phase 4 - Community notes theo context

- Note tham chiếu `portId`, `terminalId`, `gateId` và topic.
- Community suggestion không ghi đè canonical master data.
- Note public phải qua moderation/trust flow hiện có.
- Conflict giữa master source và community note hiển thị minh bạch, không tự ưu tiên theo số lượng.

## Acceptance và QA

Review bắt buộc bởi Data, Performance, Maritime, Frontend/Search, Legal/Compliance và QA.

Các scenario tối thiểu:

- LOCODE liền và có khoảng trắng trả cùng một port.
- Tên có dấu và không dấu trả cùng candidate nhưng hiển thị tên gốc.
- Alias và tên canonical được tìm thấy trong top 5 của golden set.
- WPI/UN exact match một-một được link đúng.
- Một-nhiều, khác country, conflict tọa độ và duplicate listing không bị auto-merge sai.
- Terminal/gate không làm lẫn hai port khác nhau.
- Missing source, invalid coordinate, schema change và license chưa duyệt đều bị quarantine/block.
- Airport-only và UN-only candidate không xuất hiện trong public search; port đa chức năng vẫn được giữ khi WPI hoặc port authority xác nhận.
- Query rộng không tải nhiều shard vượt budget.
- Query lặp lại dùng cache; detail không tải trước khi người dùng chọn.
- Data Saver, Ultra Lite và mạng mất kết nối có trạng thái rõ ràng.
- Build reproducible tạo cùng artifact hash.
- Benchmark dùng records tổng hợp chỉ trong memory, không commit và không publish thành dữ liệu CrewPort.

Kiểm tra tài liệu hiện tại:

```powershell
git diff --check
git status
```

Không cần chạy application build cho documentation-only change; nếu CI của repository yêu cầu, chạy quality gate hiện hành mà không sửa artifact tracked.

## Open questions

- Điều khoản redistribution chính thức của từng production release UN/LOCODE và NGA cần Legal/Compliance lock trước Phase 1.
- D-603 vẫn mở cho search engine/cache/queue/storage production; CDN shard là baseline Phase 1, không khóa vendor.
- Cần chốt CDN hosting, release signing và telemetry policy trong architecture review trước khi triển khai ingestion thật.

## JSON Schema contract appendix

Schema dưới đây chỉ định hình dữ liệu và không chứa bản ghi cảng mẫu:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:crewport:schema:port-master:v1",
  "type": "object",
  "required": ["schemaVersion", "datasetVersion", "sourceManifest", "ports", "terminals", "gates"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "port-master.v1" },
    "datasetVersion": { "type": "string", "minLength": 1 },
    "sourceManifest": {
      "type": "array",
      "items": { "$ref": "#/$defs/sourceManifestEntry" }
    },
    "ports": {
      "type": "array",
      "items": { "$ref": "#/$defs/port" }
    },
    "terminals": {
      "type": "array",
      "items": { "$ref": "#/$defs/terminal" }
    },
    "gates": {
      "type": "array",
      "items": { "$ref": "#/$defs/gate" }
    }
  },
  "$defs": {
    "sourceRef": {
      "type": "object",
      "required": ["sourceId", "externalId", "release", "sourceUrl", "retrievedAt"],
      "properties": {
        "sourceId": { "type": "string", "minLength": 1 },
        "externalId": { "type": "string", "minLength": 1 },
        "release": { "type": "string", "minLength": 1 },
        "sourceUrl": { "type": "string", "format": "uri" },
        "retrievedAt": { "type": "string", "format": "date-time" },
        "field": { "type": "string" },
        "rawValue": {}
      },
      "additionalProperties": false
    },
    "sourceManifestEntry": {
      "type": "object",
      "required": ["sourceId", "release", "sourceUrl", "termsUrl", "retrievedAt", "checksum", "reviewStatus"],
      "properties": {
        "sourceId": { "type": "string" },
        "release": { "type": "string" },
        "sourceUrl": { "type": "string", "format": "uri" },
        "termsUrl": { "type": "string", "format": "uri" },
        "retrievedAt": { "type": "string", "format": "date-time" },
        "checksum": { "type": "string", "minLength": 1 },
        "allowedUse": { "type": "string" },
        "attributionRequired": { "type": "boolean" },
        "redistributionAllowed": { "type": "boolean" },
        "reviewStatus": { "enum": ["pending", "approved", "blocked"] }
      },
      "additionalProperties": false
    },
    "alias": {
      "type": "object",
      "required": ["value", "normalizedValue", "sourceRefs"],
      "properties": {
        "value": { "type": "string", "minLength": 1 },
        "normalizedValue": { "type": "string", "minLength": 1 },
        "language": { "type": "string" },
        "kind": { "type": "string" },
        "sourceRefs": { "type": "array", "items": { "$ref": "#/$defs/sourceRef" } }
      },
      "additionalProperties": false
    },
    "coordinates": {
      "type": "object",
      "required": ["latitude", "longitude", "sourceRefs"],
      "properties": {
        "latitude": { "type": "number", "minimum": -90, "maximum": 90 },
        "longitude": { "type": "number", "minimum": -180, "maximum": 180 },
        "precision": { "type": "string" },
        "rawValue": {},
        "sourceRefs": { "type": "array", "items": { "$ref": "#/$defs/sourceRef" } }
      },
      "additionalProperties": false
    },
    "trust": {
      "type": "object",
      "required": ["status", "sourceRefs"],
      "properties": {
        "status": { "enum": ["official", "corroborated", "supplementary", "pending_review", "conflicting"] },
        "sourceRefs": { "type": "array", "items": { "$ref": "#/$defs/sourceRef" } },
        "reason": { "type": "string" }
      },
      "additionalProperties": false
    },
    "port": {
      "type": "object",
      "required": ["id", "canonicalName", "aliases", "country", "sourceRefs", "trust", "lifecycle"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "canonicalName": { "type": "string", "minLength": 1 },
        "aliases": { "type": "array", "items": { "$ref": "#/$defs/alias" } },
        "country": {
          "type": "object",
          "required": ["code", "name"],
          "properties": {
            "code": { "type": "string", "pattern": "^[A-Z]{2}$" },
            "name": { "type": "string", "minLength": 1 }
          },
          "additionalProperties": false
        },
        "city": { "type": "string" },
        "unLocode": { "type": "string", "pattern": "^[A-Z]{2}[A-Z0-9]{3}$" },
        "unLocodeSpaced": { "type": "string", "pattern": "^[A-Z]{2} [A-Z0-9]{3}$" },
        "coordinates": { "$ref": "#/$defs/coordinates" },
        "sourceRefs": { "type": "array", "items": { "$ref": "#/$defs/sourceRef" } },
        "trust": { "$ref": "#/$defs/trust" },
        "lifecycle": { "enum": ["active", "deprecated", "merged", "needsReview", "quarantined"] },
        "redirectTo": { "type": "string" }
      },
      "additionalProperties": false
    },
    "terminal": {
      "type": "object",
      "required": ["id", "portId", "name", "aliases", "sourceRefs", "trust"],
      "properties": {
        "id": { "type": "string" },
        "portId": { "type": "string" },
        "name": { "type": "string", "minLength": 1 },
        "aliases": { "type": "array", "items": { "$ref": "#/$defs/alias" } },
        "coordinates": { "$ref": "#/$defs/coordinates" },
        "sourceRefs": { "type": "array", "items": { "$ref": "#/$defs/sourceRef" } },
        "trust": { "$ref": "#/$defs/trust" }
      },
      "additionalProperties": false
    },
    "gate": {
      "type": "object",
      "required": ["id", "portId", "name", "gateType", "sourceRefs", "trust"],
      "properties": {
        "id": { "type": "string" },
        "portId": { "type": "string" },
        "terminalId": { "type": "string" },
        "name": { "type": "string", "minLength": 1 },
        "gateType": { "enum": ["crew", "cargo", "main", "security", "unknown"] },
        "coordinates": { "$ref": "#/$defs/coordinates" },
        "sourceRefs": { "type": "array", "items": { "$ref": "#/$defs/sourceRef" } },
        "trust": { "$ref": "#/$defs/trust" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## Related files

- `docs/00_MASTER_SPEC.md`
- `docs/01_DECISION_REGISTER.md`
- `src/services/contracts/port-repository.ts`
- `src/types/entities.ts`
- `src/types/read-models.ts`
