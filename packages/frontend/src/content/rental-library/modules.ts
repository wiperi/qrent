import type { GuideModule, GuideSection } from './types';

const t = (zh: string, en: string) => ({ zh, en });
const s = (
  id: string,
  title: ReturnType<typeof t>,
  body: ReturnType<typeof t>,
  aliases: ReturnType<typeof t>,
  sourceRefs: string[],
  jurisdictions = ['Australia'],
  evidence: GuideSection['evidence'] = 'editorial-guide',
  officialRefs?: string[]
): GuideSection => ({
  id,
  title,
  body,
  aliases,
  sourceRefs,
  jurisdictions,
  evidence,
  officialRefs,
});

// Source-based editorial modules. Both languages are published as one unit.
export const rentalGuideModules: GuideModule[] = [
  {
    slug: 'budget-and-housing',
    title: t('预算与房型', 'Budget and housing types'),
    summary: t(
      '先确定可承担的总费用，再比较学生公寓、整租与分租。',
      'Set an affordable total budget, then compare student accommodation, whole properties and rooms.'
    ),
    relatedPosts: [
      'shared-vs-private-renting',
      'types-of-apartments',
      'when-to-start-rental-search',
    ],
    sections: [
      s(
        'housing-options',
        t('学生公寓、整租与分租怎么选', 'Student accommodation, whole properties or rooms'),
        t(
          `原攻略把房源分成学生公寓和社会房源，再把社会房源分成整租与分租。先比较使用空间、家具、室友、通勤及管理方式，不只比较广告上的周租。

| 选择 | 主要考虑 | 看房或签约前确认 |
| --- | --- | --- |
| 学校运营的宿舍 | 校园位置、申请名额与学校管理 | 申请开放时间、房型、室友安排、空调和洗衣费用 |
| 校外学生公寓 | 家具和公共设施较齐全，管理集中 | 实际面积、是否混住、换房规则、噪音、账单与洗衣是否另付 |
| 整租 | 可与认识的人共同申请，分配房间和家具 | 所有承租人、总租金、分摊办法、空房风险和共同责任 |
| 分租一个房间 | 搬家轻便，常能找到带家具的选择 | private/shared room、卫浴共享、住户人数、室友习惯、出租权限和书面约定 |

Studio 通常是自带厨房和卫浴的开间；ensuite 指独立卫浴但厨房等可能共享；standard room 的含义要看具体运营商。Apartment、unit、house、townhouse 的名称不能代替检查：电梯、门禁、房间数量、庭院维护、隔音和储物都要逐项看。`,
          `The original handbook separates student accommodation from private rentals, then divides private rentals into whole properties and individual rooms. Compare usable space, furniture, housemates, travel and management alongside weekly rent.

| Option | Main consideration | Confirm before committing |
| --- | --- | --- |
| University-operated housing | Campus location, limited places and university management | Application dates, room type, housemates, air conditioning and laundry charges |
| Private student accommodation | Furnishings, shared facilities and central management | Usable space, mixed households, room changes, noise and extra bills |
| Whole property | Apply with people you know and arrange rooms and furniture | All tenants, total rent, cost sharing, vacant rooms and joint responsibilities |
| Individual room | Easier moving, often with furniture | Private/shared bedroom, bathroom sharing, occupancy, household habits and the right to let the room |

A studio usually has its own kitchen and bathroom. An ensuite has a private bathroom but may share a kitchen. A standard room depends on the provider. Labels such as apartment, unit, house and townhouse do not replace checking lifts, access, bedroom counts, gardens, sound insulation and storage.`
        ),
        t(
          '学生公寓 社会公寓 studio ensuite 整租 分租 合租 房型',
          'student accommodation apartment unit house townhouse studio ensuite share house room'
        ),
        ['qrent-handbook:L22-L115', 'collection-17', 'collection-18', 'collection-19']
      ),
      s(
        'budget-calculation',
        t('把周租换成完整预算', 'Calculate the full cost'),
        t(
          `沿用原攻略的正推法：年度总支出 = 学费 + 生活费 + 房租。若从年度可用资金出发，先留出学费、生活、交通和应急开支，再把可用于房租的金额除以预计租住周数。

- 月均房租可用「周租 × 52 ÷ 12」估算，不能直接把四周当一个月。
- 分清整套周租与人均周租。三卧整租 $900/周、三人均分时，基本房租是每人 $300/周；主次卧差价、账单和空房会改变结果。
- 除了持续租金，另准备押金、合规的预付租金、搬家、家具床品和开通服务的现金。押金是现金占用，不应重复算成每周消费。
- 把水、电、燃气、网络、交通与洗衣费用写进同一张预算表，确认哪些包含在租金里。

原文用每周生活费 $400、房租 $488、年度学费 $54,000 举例，合计 $100,176；以假设汇率 4.6 换算为人民币 460,809.6。这里保留计算方法，这些是原文的假设数字，不是当前学费、房租或汇率。`,
          `Keep the handbook’s forward calculation: annual spending = tuition + living costs + rent. Starting with your available annual funds, reserve tuition, living, travel and emergency money, then divide the rental allocation by the weeks you expect to rent.

- Estimate monthly rent with weekly rent × 52 ÷ 12; four weeks is not a calendar month.
- Separate whole-property rent from rent per person. A $900 weekly three-bedroom property split equally between three people means $300 each before bills, room differences and vacancies.
- Allow cash for the bond, permitted advance rent, moving, furniture, bedding and service connections. A bond ties up cash; do not also count it as recurring weekly spending.
- Record water, electricity, gas, internet, transport and laundry together, checking what is included.

The source example uses $400 weekly living costs, $488 rent and $54,000 annual tuition, totalling $100,176. At an assumed exchange rate of 4.6 this is RMB 460,809.6. These illustrate the arithmetic, not current fees, rental prices or exchange rates.`
        ),
        t(
          '租房预算怎么算 每月房租 人均周租 生活费 bills 家具 押金',
          'rental budget weekly monthly rent per person living costs bills furniture bond'
        ),
        ['qrent-handbook:L119-L174', 'collection-20']
      ),
      s(
        'historic-price-examples',
        t('旧报价只用于理解口径', 'Read historical price examples correctly'),
        t(
          `收藏第15篇是 2024-08-11 的区域导图，以下为作者当时整理的 Unit 人均澳元周租，不是整套报价或当前均价：

| 区域 | 两卧人均/周 | 三卧人均/周 |
| --- | ---: | ---: |
| Kingsford | 398 | 367 |
| Randwick | 420 | 400 |
| Kensington | 400 | 367 |
| Zetland | 525 | 500 |
| Waterloo | 500 | 450 |
| Eastgardens | 525 | 467 |
| Mascot | 475 | 434 |
| Rosebery | 475 | 467 |
| Wolli Creek | 425 | 400 |
| Pagewood | 400 | 383 |
| Maroubra | 400 | 367 |

旧攻略中的 Scape、Iglu、墨尔本价格和疫情优惠也属于历史样例。比较现在的房子时，重新核对房型、人数、是否含账单、优惠期和完整租期；标题里的“200刀房”并不代表今天能以该价格租到独立住房。`,
          `Collection post 15 is dated 11 August 2024. Its Unit figures below are the author’s historical AUD weekly amounts per person, not whole-property prices or current medians.

| Area | Per person in 2 bedrooms | Per person in 3 bedrooms |
| --- | ---: | ---: |
| Kingsford | 398 | 367 |
| Randwick | 420 | 400 |
| Kensington | 400 | 367 |
| Zetland | 525 | 500 |
| Waterloo | 500 | 450 |
| Eastgardens | 525 | 467 |
| Mascot | 475 | 434 |
| Rosebery | 475 | 467 |
| Wolli Creek | 425 | 400 |
| Pagewood | 400 | 383 |
| Maroubra | 400 | 367 |

Scape, Iglu, Melbourne prices and pandemic discounts in the references are also historical examples. Recheck room type, occupancy, bills, discount duration and total lease length when comparing today’s options. A post titled “$200 housing” does not promise a self-contained home at that price now.`
        ),
        t(
          '历史租金 2024 人均 房租中位数 200刀 价格口径',
          'historical rent 2024 per person whole property median discount'
        ),
        [
          'qrent-handbook:L139-L172',
          'collection-15',
          'collection-17',
          'collection-18',
          'collection-19',
          'collection-20',
        ],
        ['Sydney', 'Melbourne'],
        'historical-example'
      ),
      s(
        'roommate-and-timing',
        t('提前准备与室友约定', 'Plan timing and housemates'),
        t(
          `原攻略的筹备顺序是：提前约5–7周明确需求和预算，约3–5周准备文件，再围绕合适的起租日安排实看和申请。这是规划参考，不是所有房源统一开放的时间。

一起整租前，先写清每人预算、主次卧分配、租期、清洁、作息、访客、家具归属、账单分摊，以及有人提前搬走怎么办。学生公寓的 twin room 要特别确认是否共享卧室、床位之间如何分隔、室友分配及换房政策。收藏第17、18篇的噪音、空间和维修经历是适合向运营方提问的检查项，不是对全部住户或公寓的统一结论。`,
          `The handbook suggests setting needs and budget about 5–7 weeks ahead, preparing documents around 3–5 weeks ahead, and arranging inspections around a suitable start date. This is a planning sequence, not a universal release schedule.

Before sharing a lease, agree budgets, room allocation, lease length, cleaning, routines, visitors, furniture ownership, bills and early departures. For a twin room, confirm whether the bedroom is shared, how beds are separated, housemate allocation and room-change rules. Noise, space and maintenance stories in posts 17 and 18 are useful questions for providers, not universal findings about every resident or building.`
        ),
        t(
          '提前多久找房 室友 twin room 换房 申请宿舍 租期',
          'when to start rental search housemates twin room lease length room change'
        ),
        ['qrent-handbook:L22-L48', 'collection-17', 'collection-18']
      ),
    ],
  },
  {
    slug: 'areas-and-commute',
    title: t('学校选区与通勤', 'Areas and the campus commute'),
    summary: t(
      '以具体校区和门牌为起点，比较步行、公共交通与日常配套。',
      'Compare walking, public transport and amenities using the actual campus and street address.'
    ),
    relatedPosts: ['rental-suburbs-platforms', 'rental-platforms-from-overseas'],
    sections: [
      s(
        'unsw-areas',
        t('UNSW 先比较哪些区域', 'Areas to compare around UNSW'),
        t(
          `原攻略和收藏第13、15篇都以 UNSW Kensington 校区为中心。可按生活方式分组建立候选清单：

| 区域组 | 原资料关注点 | 实际选房要核对 |
| --- | --- | --- |
| Kensington、Kingsford、Randwick | 近校、步行可能性；旧 house、unit 与公寓并存 | 到具体校门的路线、空调、隔音、采光和超市步行距离 |
| Zetland、Waterloo | 公寓、East Village 等生活配套 | 公交站距离、早高峰拥挤、噪音、实际车次 |
| Rosebery、Mascot | 公寓与 house；公交、Green Square/Mascot 轨道交通 | 到校是否需要换乘、机场或道路噪音、门牌位置 |
| Eastgardens、Pagewood | Westfield 配套、部分较新公寓 | 到学校与市中心的不同路线、公交候车和商场距离 |
| Maroubra、Matraville、Hillsdale、Eastlakes、Alexandria | 更多 house/unit 和替代区域 | 房况、空调、采购路线及完整通勤 |

资料里的“约15–30分钟”等为当时粗估，不能代替门到门路线；区域安全和“多数房子很新”等个人印象也不能当统计。区域名称统一为 Kingsford、Eastgardens、Wolli Creek、Alexandria，保留校区与州信息，避免同名区选错。`,
          `The handbook and collection posts 13 and 15 use UNSW’s Kensington campus as their starting point. Build a shortlist by living style.

| Area group | What the sources discuss | What to verify for the actual home |
| --- | --- | --- |
| Kensington, Kingsford, Randwick | Campus proximity and walking; a mix of houses, units and apartments | Route to your gate, cooling, noise, light and groceries |
| Zetland, Waterloo | Apartments and amenities such as East Village | Stops, peak-hour crowding, noise and actual services |
| Rosebery, Mascot | Apartments/houses, buses and rail connections | Transfers to campus, airport/road noise and the exact address |
| Eastgardens, Pagewood | Westfield and some newer apartments | Separate campus/city journeys, waiting and shopping access |
| Maroubra, Matraville, Hillsdale, Eastlakes, Alexandria | Further house/unit alternatives | Condition, cooling, shopping and the full journey |

Historical “15–30 minute” estimates are not door-to-door promises. Personal safety or building-age impressions are not statistics. Spellings are normalised to Kingsford, Eastgardens, Wolli Creek and Alexandria; retain campus, state and postcode to avoid selecting the wrong place.`
        ),
        t(
          'UNSW 新南 租房区域 Kensington Kingsford Randwick Eastgardens Zetland Mascot',
          'UNSW Kensington Kingsford Randwick Eastgardens Zetland Mascot neighbourhoods'
        ),
        ['qrent-handbook:L179-L218', 'collection-13', 'collection-15'],
        ['Sydney']
      ),
      s(
        'usyd-uts-areas',
        t('悉尼大学与 UTS 分开看校区', 'Separate USYD and UTS campus journeys'),
        t(
          `悉尼大学要核对 Camperdown/Darlington 具体教学楼；UTS 要核对 City/Broadway 的实际楼宇。两校邻近市区，不代表同一门牌到两校的通勤相同。

- 近校候选：USYD 可先比较 Newtown、Glebe、Camperdown 和 Chippendale；UTS 可先比较 Ultimo、Haymarket、Chippendale，再看 Redfern、Pyrmont、Surry Hills 等既有目录区域。
- 公共交通候选：Burwood、Wolli Creek、Hurstville、Zetland/Waterloo、Mascot 等，要把去车站和下车后的步行加进去。
- 市中心候选：City/Haymarket 要比较生活便利、夜间噪音、具体房型与周租，而不是只看“市中心”标签。

收藏第14篇的地图是概念示意，不是街区边界或实际路线。旧文中“Newtown都要坐车”“Glebe都只走5分钟”等概括不能套到每个门牌。`,
          `For USYD, check your actual teaching building in Camperdown/Darlington. For UTS, use the relevant City/Broadway building. Being near the city does not give one address the same journey to both universities.

- Nearby options: start USYD comparisons with Newtown, Glebe, Camperdown and Chippendale. For UTS, start with Ultimo, Haymarket and Chippendale, then compare Redfern, Pyrmont and Surry Hills in the existing directory.
- Transit options: Burwood, Wolli Creek, Hurstville, Zetland/Waterloo and Mascot require the walks to and from stops as well as the ride.
- City/Haymarket: compare convenience, night noise, room type and weekly rent rather than the city-centre label alone.

Post 14’s map is a conceptual sketch, not a boundary or route measurement. Claims such as every Newtown home needing a bus or every Glebe home being five minutes away cannot apply to all street addresses.`
        ),
        t(
          '悉尼大学 悉大 USYD UTS 悉尼科技大学 Newtown Glebe Ultimo Chippendale',
          'University of Sydney USYD UTS Ultimo Newtown Glebe Chippendale'
        ),
        ['qrent-handbook:L220-L254', 'collection-14'],
        ['Sydney']
      ),
      s(
        'melbourne-campus-reference',
        t('墨尔本资料按校区区分', 'Distinguish Melbourne campuses'),
        t(
          `两份资料里也有墨尔本的历史选区参考：Parkville、Carlton、North Melbourne 主要围绕墨尔本大学主校区讨论；Richmond 是需要另查具体公共交通的选项。Notting Hill 对应 Monash Clayton，Caulfield 与 Glen Huntly 对应 Monash Caulfield，不能都写成“墨大周边”。

收藏第12篇发表于2022年，金额没有统一说明是整租还是单间、按周还是其他周期，因此这里不把它转成最新周租表。学校、校区和具体门牌确认后，再核对当前价格与上课时段路线。当前 QRent 的房源入口以悉尼既有范围为主。`,
          `The references also contain historical Melbourne area notes. Parkville, Carlton and North Melbourne mainly relate to the University of Melbourne’s main campus; Richmond needs a specific transport check. Notting Hill relates to Monash Clayton, while Caulfield and Glen Huntly relate to Monash Caulfield. These should not all be labelled “near Melbourne University”.

Post 12 is from 2022 and does not consistently identify whole-property versus room prices or their billing period. It is not converted into a current weekly-price table. Confirm university, campus and address before checking current prices and class-time travel. QRent’s current listing entry points focus on the existing Sydney scope.`
        ),
        t(
          '墨尔本 墨大 Parkville Carlton Monash Clayton Caulfield Glen Huntly',
          'Melbourne Parkville Carlton Monash Clayton Caulfield Glen Huntly'
        ),
        ['qrent-handbook:L163-L172', 'qrent-handbook:L257-L274', 'collection-12'],
        ['Melbourne'],
        'historical-example'
      ),
      s(
        'door-to-door-check',
        t('按门到门时间检查通勤', 'Check the whole door-to-door journey'),
        t(
          `把通勤拆成四段：从门口走到站点、候车、乘车或换乘、下车走到教学楼。按实际上课的工作日与时段检查，兼看晚课返程；有多校室友时，分别查每个人的校区。

原文额外预留约10分钟候车是经验缓冲，不是每条线路固定等待时间。再核对最近的 Coles、ALDI、Woolworths、药店、便利店和健身设施，记录实际步行时间。最终用具体门牌复核照片、地图与现场，不能根据区域圆圈或帖子地图推算精确通勤。`,
          `Split the journey into walking to the stop, waiting, riding/transferring, and walking to the teaching building. Check the weekday and time of your classes, including the return after evening classes. Housemates at different campuses need separate checks.

The source’s extra ten-minute waiting allowance is a planning buffer, not a fixed wait on every route. Also check groceries, pharmacies, convenience stores and exercise facilities using actual walking times. Verify the street address against the map and inspection; an approximate circle or a post’s sketch cannot establish an exact commute.`
        ),
        t(
          '通勤 门到门 等车 转车 校区 交通 步行 路线',
          'commute door to door wait transfer campus walk route public transport'
        ),
        ['qrent-handbook:L459-L476', 'collection-10', 'collection-13', 'collection-14'],
        ['Sydney', 'Melbourne']
      ),
    ],
  },
  {
    slug: 'platforms-and-search',
    title: t('平台找房与筛选', 'Platforms and rental search'),
    summary: t(
      '读懂区域、房源状态、起租日和申请入口，再安排看房。',
      'Check areas, listing status, availability and application channels before arranging inspections.'
    ),
    relatedPosts: [
      'rental-platforms-from-overseas',
      'rental-suburbs-platforms',
      'available-date-rental-cover-letter',
    ],
    sections: [
      s(
        'search-workflow',
        t('Real Estate、Domain 与 QRent 怎么配合', 'Use Real Estate, Domain and QRent together'),
        t(
          `沿用原攻略的流程：选择学校或区域，设定预算与房型，读房源详情，登记看房，按中介指定的渠道递交申请，再核对获批条件和租约。

1. 在源站选择 Rent，核对区域、NSW/VIC 等州名和邮编。同名区域可能在不同州；“包含周边区域”会扩大范围。
2. 筛周租上下限、卧室卫浴、车位、家具、入住日期和所需设施。空调等要求可辅助用关键词搜索，但仍需到详情和现场确认。
3. 核对 Available Date（可起租日）是否适合自己；Deposit Taken 等状态提示可能已经收款或在推进租约，不代表仍可随时申请。
4. 用列表或地图建立候选清单，再用完整门牌核对到学校与超市的路线。QRent 可帮助按既有学校、区域、预算和参考通勤筛选；最终价格、状态和申请渠道回到 Domain/Real Estate 或中介确认。

`,
          `Keep the handbook’s sequence: choose a university/area, set budget and housing needs, read the listing, register for inspection, apply through the agent’s specified channel, then check approval terms and the lease.

1. Select Rent and confirm suburb, state and postcode. Names can recur in different states; including surrounding areas expands the search.
2. Filter weekly price, bedrooms, bathrooms, parking, furniture, start date and facilities. Keywords such as air conditioning help, but still require verification.
3. Match Available Date to your intended start. Deposit Taken can indicate payment or a lease in progress; it does not promise availability.
4. Shortlist in list/map views, then check the full address for campus and shopping travel. QRent supports its existing school/area, budget and indicative-commute filters. Confirm price, status and application instructions with the source or agent.

`
        ),
        t(
          'realestate domain 使用教程 rent available date deposit taken 找房 筛选',
          'realestate Domain Rent available date Deposit Taken filters rental search'
        ),
        ['qrent-handbook:L278-L320', 'collection-16', 'collection-20']
      ),
      s(
        'room-search',
        t('Flatmates 分租要核对什么', 'What to check on Flatmates'),
        t(
          `收藏第19篇从 Rooms 入口讲分租：输入区域或邮编，再筛预算、入住日期、租期、家具、private/shared room、own/ensuite bathroom、停车和住户条件。独立卧室不等于独立卫浴；shared room 也不是只共享客厅。

逐项读周租是否包 bills、住户人数是当前还是满员、家具清单、是否接收情侣、厨房卫浴共享、室友生活习惯与房间门锁。About the Flatmates 和房屋介绍都要看，摘要图标与正文不一致时直接询问。

地图可能只给大概位置，准确地址需联系对方后核实。旧帖里的 Early Bird、Free to Message 等消息权限属于当时界面，使用时看当前平台规则。Gumtree 和社交平台直租也要核对出租权限、身份、实房和书面约定。`,
          `Post 19 starts room searches from Rooms: enter suburb/postcode, then filter budget, start date, duration, furniture, private/shared bedrooms, own/ensuite bathrooms, parking and household conditions. A private bedroom does not imply a private bathroom; a shared room means more than sharing a living room.

Read bill inclusions, current versus full occupancy, furniture, couples policy, shared kitchens/bathrooms, household routines and locks. Check both About the Flatmates and the property description. Ask about contradictions between icons and text.

A map may show only an approximate location; confirm the address with the advertiser. Early Bird and Free to Message restrictions in the old post were historical interface rules. Gumtree and social-media listings also require checks of authority to let, identity, the actual home and written terms.`
        ),
        t(
          'Flatmates 分租 private room shared room ensuite bills included 找室友 Gumtree',
          'Flatmates private room shared room ensuite bills included housemates Gumtree'
        ),
        ['qrent-handbook:L107-L115', 'qrent-handbook:L302-L311', 'collection-19']
      ),
      s(
        'listing-history-and-booking',
        t('补看房屋历史并登记看房', 'Check property history and register to inspect'),
        t(
          `当前广告没有平面图或照片很少时，可复制完整地址搜索 Real Estate 的物业资料页，补看 Property history、旧照片、航拍和平面图。历史图能提示你现场核对哪些地方，不能证明今天仍保持同样房况；模糊的尺寸不要猜。

有公开 Inspections 时间时登记 Register，留意取消或改期通知；没有时间时用 Enquire / Request an inspection 联系中介。境外找房可以请可信的人代看并交付影像，或先安排短住后实地找房。

完整填写 renter profile 后，中介仍可能要求 2Apply、邮件表格或其他系统。每次确认具体链接与所需文件，不把一个平台档案等同于全部申请已完成。`,
          `If the current advertisement lacks plans or photos, search the full address for its Real Estate property profile. Property history, older photos, aerial views and plans can identify things to inspect; they cannot prove the current condition. Do not guess unreadable dimensions.

Register for scheduled inspections and watch for changes. If none are listed, use Enquire or Request an inspection to contact the agent. From overseas, arrange a trusted inspection with recordings or temporary accommodation before inspecting personally.

Completing a renter profile does not prevent the agent requesting 2Apply, an emailed form or another system. Confirm the specific link and required files each time; one saved profile does not mean every application is complete.`
        ),
        t(
          '找平面图 property history register inspection 2Apply renter profile 代看 国内找房',
          'floor plan property history register inspection 2Apply renter profile overseas inspection'
        ),
        [
          'qrent-handbook:L295-L299',
          'qrent-handbook:L448-L454',
          'qrent-handbook:L584-L586',
          'collection-09',
          'collection-16',
          'collection-20',
        ]
      ),
    ],
  },
  {
    slug: 'application-documents',
    title: t('申请材料与自荐信', 'Application documents and letters'),
    summary: t(
      '把身份、资金、居住史、证明人与入住计划整理成可核实的申请。',
      'Prepare verifiable identity, funding, housing history, references and move-in plans.'
    ),
    relatedPosts: [
      'rental-application-australia',
      'rental-history-guarantor',
      'available-date-rental-cover-letter',
      'rental-application-results',
    ],
    sections: [
      s(
        'document-checklist',
        t('先准备可复用的材料夹', 'Prepare a reusable document folder'),
        t(
          `原攻略列出护照、Visa、COE/学校录取材料、资金证明、推荐信、Cover Letter 和 Parent Letter。它们是准备清单，不表示每家中介都要求全部材料或相同存款金额。

| 类别 | 可以准备的材料 | 核对事项 |
| --- | --- | --- |
| 身份与学习 | 护照、签证、COE/offer、学生证（按要求） | 有效期、姓名一致、文件清楚完整 |
| 付款能力 | 银行账单/存款证明、真实工资或奖学金、父母资助说明 | 来源与可持续性，不编造收入；按要求提供必要资料 |
| 居住经历 | 国内或海外真实地址、tenant ledger、前房东推荐信 | 日期、联系方式、是否已征求证明人同意 |
| 补充说明 | Cover Letter、Parent Letter、相关支持附件 | 与申请表、房源及租期一致 |

收藏第9篇特别提醒 OSHC 保险会员卡不是 Medicare card，不能随意替代文件。整理统一命名的文件夹，投不同平台前逐项检查，避免漏传签证、遗漏合租申请人或用过期文件。`,
          `The handbook lists passport, visa, COE/offer, funding evidence, references, a cover letter and a parent-support letter. This is a preparation checklist, not a statement that every agent needs every document or the same bank balance.

| Category | Possible evidence | Check |
| --- | --- | --- |
| Identity/study | Passport, visa, COE/offer, student card if requested | Validity, consistent names and readable complete files |
| Ability to pay | Bank records/savings, genuine employment or scholarship, parental support | Sources and continuity; no invented income; provide what is needed |
| Housing history | Real domestic/overseas addresses, tenant ledger and references | Dates, contacts and referee consent |
| Explanation | Cover letter, parent letter and relevant supporting files | Consistency with the form, home and lease dates |

Post 9 notes that an OSHC membership card is not a Medicare card. Keep clearly named reusable files and check each submission for missing visas, housemate applications and expired documents.`
        ),
        t(
          '申请材料 文件清单 护照 签证 COE 存款证明 银行流水 OSHC Medicare',
          'rental application documents passport visa COE bank statement savings OSHC Medicare'
        ),
        ['qrent-handbook:L325-L340', 'collection-06', 'collection-09', 'collection-11']
      ),
      s(
        'cover-letter',
        t('Cover Letter 写什么', 'What belongs in a cover letter'),
        t(
          `先写清申请的房屋地址、申请人及可入住日期，再围绕以下内容做简明介绍：

1. 身份与学习/工作：学校、课程、在读或工作情况，计划租期及合租人。
2. 为什么这套房合适：用真实通勤、布局和生活需求说明，不照搬别人信里的学校、专业或房型。
3. 经济来源：如实说明工资、奖学金、存款或父母支持，并指向相应附件。
4. 居住经历与习惯：说明真实住址、参考人、如何保持清洁和照顾房屋；宠物、吸烟等情况据实填写。
5. 联系方式和附件：便于联系，表示愿意回答问题或按要求补材料。

收藏第7篇提取的是英文申请信的结构，第11篇的长篇 About me 是个人写法，并非统一字数要求。原文中的“预付三个月”不作为申请模板建议；付款与竞价须按房源所在州现行规定核对。`,
          `Identify the property, applicants and available start date, then give a concise explanation of:

1. Study/work and household: university, course or employment, intended lease and co-applicants.
2. Why this home fits: genuine travel, layout and living needs rather than another applicant’s course, institution or floor plan.
3. Funding: actual employment, scholarship, savings or parental support, with the corresponding attachments.
4. Housing history and habits: real addresses/referees, cleaning and care for the home; disclose relevant pets or smoking accurately.
5. Contact and attachments: make contact easy and offer to clarify or supply requested evidence.

Post 7 contributes a letter structure; the long About me in post 11 is a personal choice, not a required word count. The old example offering three months in advance is not carried into a recommended template. Check the relevant state’s payment and bidding rules.`
        ),
        t(
          'cover letter 租房自荐信 About me 申请信 模板 内容',
          'rental cover letter introduction about me template application letter'
        ),
        ['qrent-handbook:L342-L394', 'collection-07', 'collection-11'],
        ['Australia']
      ),
      s(
        'parent-letter-and-history',
        t(
          '父母资助、Guarantor 与无本地租房史',
          'Parental support, guarantors and no local history'
        ),
        t(
          `Parent Letter 可以说明与申请人的关系、将承担哪些费用、支持金额与频率、资金来源、联系方法、日期和签名，并配合真实的资金证明。原攻略中的“每周$300”“生活费每月$800”“存款¥500,000”都是可替换的示例，不是门槛。

资助说明信和承担法律责任的 guarantor 承诺并不自动等同。若中介要求担保，先读清要签的具体责任范围，再由相关人决定。没有澳洲租房史，就如实说明国内或原来与家人居住的经历，询问可接受的证明方式。

Address history、Employment、Income、Identity documents 和 Emergency contact 分别按真实情况填写。联系推荐人前取得同意，并提醒其留意核实邮件或短信；不要编造房东、工作、推荐语或储蓄。`,
          `A parent-support letter can state the relationship, costs supported, amounts/frequency, funding source, contact details, date and signature, backed by real evidence. The handbook’s $300/week, $800/month and RMB 500,000 are replaceable examples, not thresholds.

A support letter does not automatically equal a guarantor’s legal commitment. If a guarantee is requested, understand the actual liability before the relevant person agrees. Without Australian rental history, explain your genuine overseas or family-home history and ask what evidence is acceptable.

Complete address history, employment, income, identity and emergency-contact fields accurately. Get referees’ permission before contact and alert them to verification messages. Do not invent landlords, jobs, references or savings.`
        ),
        t(
          'parent letter 父母资助信 guarantor 担保人 没有租房记录 rental history 证明人',
          'parent support letter guarantor no rental history address history referee consent'
        ),
        ['qrent-handbook:L396-L440', 'collection-08', 'collection-11'],
        ['Australia'],
        'editorial-guide',
        ['study-australia-applications']
      ),
      s(
        'submit-and-follow-up',
        t('看房、递交和跟进顺序', 'Inspect, submit and follow up'),
        t(
          `看房前准备好文件和可联系的电话；现场表达真实兴趣，确认申请平台及是否需要每位合租人分别申请。递交后保存申请回执、房源地址和中介联系记录，礼貌询问是否收到或还缺什么材料。

可以比较多套合适房源，但获批、支付 holding fee、签约是不同阶段；做出承诺前核对后果。收藏第8篇的“当天获批”和第9篇周末后得到回复，说明时间线可能不同，不能承诺几小时获批或申请必过。

尽量用电话处理急事，同时把重要日期、价格、费用和约定以书面方式确认。起租日太早会产生空置期间租金，先把实际到达和搬入计划核对好。`,
          `Prepare documents and a working contact number before inspecting. Express genuine interest and confirm the application channel and whether every co-tenant must apply. Save submission receipts and correspondence, then politely check receipt or missing evidence.

You can compare suitable properties, but approval, paying a holding fee and signing a lease are different stages with different consequences. Posts 8 and 9 describe different response times, including an approval story and a reply after a weekend; neither guarantees same-day acceptance.

Use the phone for urgent coordination and confirm important dates, prices, charges and agreements in writing. Starting too early can mean rent before you occupy the home, so check arrival and moving plans first.`
        ),
        t(
          '申请后多久 回复 跟进 offer 申请被拒 付款 起租日',
          'application response follow up offer rejected application start date'
        ),
        ['qrent-handbook:L520-L536', 'collection-06', 'collection-08', 'collection-09']
      ),
    ],
  },
  {
    slug: 'inspection-checklist',
    title: t('看房与代看清单', 'Inspection and proxy checklist'),
    summary: t(
      '从门口、周边到每个房间，把现场需要确认的项目逐项记录。',
      'Record what to check outside, around the neighbourhood and in every room.'
    ),
    relatedPosts: ['rental-inspection', 'rental-application-australia'],
    sections: [
      s(
        'before-inspection',
        t('预约与周边检查', 'Booking and the surrounding area'),
        t(
          `先登记公开看房，未排时间则联系中介确认；出发前查看是否取消、地址是否正确、自己或代看人是否已登记。查历史广告，记下照片与现场需要比对的地方。

- 拍下房屋入口、楼道与门禁，确认门锁、访客进入方式及信箱。
- 按真实门牌走到公交或火车站，核对去学校和市中心的路线、候车与换乘。
- 记录 Coles、ALDI、Woolworths、药店、便利店、餐厅、公园与健身设施的实际步行距离。
- 查看主要道路、施工、机场或其他噪音来源，比较白天与自己实际使用时段。

在仍有人居住的房屋拍照或录像前，先征得许可，避开住户个人物品和文件。`,
          `Register for a scheduled inspection or arrange one with the agent. Before leaving, check for cancellations, the correct address and registration for you or your proxy. Review older advertisements to identify things to compare on site.

- Record the entry, corridor and access arrangements, including locks, visitors and mail.
- Walk from the actual address to transport and check campus/city journeys, waiting and transfers.
- Note real walking access to groceries, pharmacies, convenience stores, restaurants, parks and exercise facilities.
- Identify roads, construction, airport or other noise and consider the times you will be home.

Ask permission before photographing an occupied home and avoid residents’ belongings and documents.`
        ),
        t(
          '看房前 预约 inspection 周边 门禁 车站 超市 代看',
          'before inspection register neighbourhood access station groceries proxy'
        ),
        ['qrent-handbook:L448-L476', 'collection-08', 'collection-10']
      ),
      s(
        'room-checklist',
        t('室内与设施逐项看', 'Inspect the rooms and facilities'),
        t(
          `| 位置 | 检查项目 |
| --- | --- |
| 每个房间 | 朝向、日照与遮挡；可开启窗、通风；墙面、天花板、霉斑和异味 |
| 客厅与卧室 | 是否有空调或取暖，具体覆盖哪些房间；关窗隔音；储物空间和家具新旧 |
| 卧室尺寸 | 实测床架、衣柜、书桌及走道能否放下；不拿照片或模糊平面图估精确尺寸 |
| 厨房 | 灶台类型和运转、抽油烟机、洗碗机、微波炉、烤箱、冰箱；水龙头与排水 |
| 洗衣区 | 洗衣机/烘干机是否配备、机器状态、排水、是否公共收费 |
| 卫浴 | 门锁、排气扇、淋浴、干湿分区、水压排水；支架、毛巾架等小部件 |
| 阳台与庭院 | 朝向、景观、低层隐私、临街噪音、维护责任 |
| 楼内设施 | 电梯、健身房、泳池、门禁是否实际可用，维护与开放条件 |

原清单的 Queen size 约1.6×2.0米是测量示例，床架和通道仍要单独留空间。宣传写有某设施，不等于实际运行正常。`,
          `| Location | What to check |
| --- | --- |
| Every room | Orientation, sunlight and obstructions; opening windows, ventilation, walls, ceilings, mould and smells |
| Living/bedrooms | Heating/cooling and which rooms it serves; noise with windows shut; storage and furniture condition |
| Bedroom size | Measure bed frame, wardrobe, desk and circulation space; do not infer exact sizes from photos or blurry plans |
| Kitchen | Cooktop, extractor, dishwasher, microwave, oven, fridge, taps and drainage |
| Laundry | Washer/dryer provision, condition, drainage and shared-machine charges |
| Bathroom | Locks, extractor, shower, separation, pressure/drainage and smaller fittings |
| Balcony/garden | Orientation, outlook, privacy, street noise and maintenance duties |
| Shared facilities | Actual operation, maintenance and access to lifts, gym, pool and entry systems |

The source’s approximate 1.6 × 2.0 metre queen-bed example is only a measuring prompt. Allow for the frame and walkways. An advertised facility may still need operational checks.`
        ),
        t(
          '看房清单 空调 洗碗机 采光 隔音 通风 霉斑 家具 床 尺寸',
          'inspection checklist air conditioning dishwasher light noise ventilation mould furniture bed dimensions'
        ),
        ['qrent-handbook:L479-L506', 'collection-01', 'collection-10']
      ),
      s(
        'proxy-deliverables',
        t('代看需要交付什么', 'What a proxy inspector should return'),
        t(
          `把清单提前交给代看者，并明确哪些是自己不能接受的条件。交付至少包括：每个房间的连续视频或全景记录、从楼道到门口的进入路线、窗外和阳台景观、主要设备照片、问题近照，以及不能验证的项目。

同时记录实际看房时间、光线、天气或其他影响观察的条件。拍摄不能代替测量、设备测试和询问；无权限操作的地方，标明未测试，不写成正常。

请代看者确认 bills 包含范围、家具、申请平台、起租日、物业设施与尚待中介回复的问题。原帖讨论的加价或大额预付不纳入代看任务；只记录广告条件和真实问答。`,
          `Send the checklist in advance, including your non-negotiable requirements. Ask for continuous or panoramic records of each room, the route through the corridor to the door, window/balcony outlooks, key equipment, close-ups of issues and items that could not be verified.

Record inspection time, lighting, weather and other conditions affecting observations. Recording is not a substitute for measurements, tests or questions. Mark untested items as untested rather than working.

Confirm bills, furniture, application channel, start date, facilities and unanswered questions. Do not turn historical suggestions about higher offers or large advance payments into proxy tasks; record the advertised terms and actual answers.`
        ),
        t(
          '代看 视频 照片 交付 检查结果 未测试 远程看房',
          'proxy inspection video photos deliverables untested remote inspection'
        ),
        ['qrent-handbook:L509-L517', 'collection-10']
      ),
    ],
  },
  {
    slug: 'contracts-and-bond',
    title: t('合同、定金与押金', 'Lease, holding fee and bond'),
    summary: t(
      '核对租约、钱款名称与监管凭证，按所在州确认适用规则。',
      'Check the lease, payment type and lodgement evidence under the relevant state rules.'
    ),
    relatedPosts: ['rental-application-results', 'available-date-rental-cover-letter'],
    sections: [
      s(
        'lease-checklist',
        t('签约前核对哪些栏目', 'What to check before signing'),
        t(
          `原攻略和收藏第4篇的核对顺序可以保留：

- 房东/代理及所有租客姓名、联系方式、通知送达地址，房屋地址与包含的设施。
- 固定或周期租约、开始和结束日期、租金金额、支付周期及约定付款方式。
- 押金金额、登记的租客、交存对象和凭证；居住人数及物业/strata 规则。
- 电、气、水和 embedded network 的具体条款，不能笼统理解成“所有 bills 都包”。
- 紧急维修联系人、烟雾报警器、钥匙门禁、condition report、电子送达约定和签署日期。

双方留存完整合同与附件。收藏里的“2024合同”截图实际是2020版模板的部分页面，不能用它代替当前完整租约，也不能从未展示的页面猜条款。`,
          `Keep the checklist from the handbook and post 4:

- Landlord/agent and every tenant’s names, contacts and notice addresses; the property and included facilities.
- Fixed or periodic agreement, start/end dates, rent, payment cycle and agreed methods.
- Bond amount, named tenants, lodgement recipient and evidence; occupancy and strata rules.
- Specific electricity, gas, water and embedded-network terms, rather than assuming all bills are included.
- Emergency repair contacts, smoke alarms, keys/access, condition report, electronic notices and signatures.

Both sides should retain the complete agreement and attachments. The collection’s “2024 lease” screenshots show only parts of a 2020 template, not a replacement for the current full agreement or evidence of unseen clauses.`
        ),
        t(
          '租房合同 lease tenancy agreement 签约 strata embedded network 紧急联系人',
          'rental lease tenancy agreement signing strata embedded network emergency contacts'
        ),
        ['qrent-handbook:L539-L554', 'collection-04']
      ),
      s(
        'nsw-upfront-payments',
        t('NSW 起租费用分清三类', 'Three different NSW upfront payments'),
        t(
          `NSW 普通住宅租赁的官方指引区分：holding fee 最多一周租金，只在申请获批后可要求，签约后计入租金；rental bond 最多四周租金；房东或中介不得要求超过两周的预付租金。

旧资料把“一周或十天 deposit”“首两周租金”“一个月押金”混写，不能仅凭邮件用了 deposit 就判断钱款性质。付款前确认用途、金额、适用条款和收据。一个月也不等于四周。

竞价方面，NSW 禁止房东/中介招揽或邀请高于广告租金的报价。旧帖的“加一点更容易获批”不是通用申请步骤；遇到要求加价或额外预付，先核对最新官方说明。上述限制不要直接套到 VIC、ACT 或不同住宿合同。`,
          `For ordinary NSW residential tenancies, official guidance distinguishes a holding fee of at most one week, requested only after approval and credited to rent if the lease is signed; a bond of at most four weeks; and advance rent that the landlord/agent cannot require beyond two weeks.

Historical references mix a “one-week or ten-day deposit”, initial rent and a “month’s bond”. Check the payment’s purpose, terms and receipt rather than its label. A month is not four weeks.

NSW prohibits landlords/agents soliciting or inviting offers above advertised rent. Historical advice to offer extra is not a standard application step. Check current guidance before responding to requests for extra payment. Do not transfer these rules to VIC, ACT or a different accommodation agreement.`
        ),
        t(
          'NSW holding fee deposit bond 定金 押金 四周 预付租金 rent bidding 加价',
          'NSW holding fee deposit rental bond four weeks advance rent rent bidding'
        ),
        ['qrent-handbook:L545-L557', 'collection-03', 'collection-04', 'collection-06'],
        ['NSW'],
        'official-rule',
        ['nsw-start-costs', 'nsw-rent-bidding']
      ),
      s(
        'bond-lodgement',
        t('交存与保留押金记录', 'Lodgement and bond records'),
        t(
          `NSW 的 Rental Bonds Online（RBO）与维州 RTBA 是不同的押金系统。核对中介发出的邀请里租客、房屋和金额，独立确认是真实官方入口，再按系统要求办理；保存交存凭证、bond 编号及通知邮件。

收藏第5篇邮件示例中的邀请有效期和银行卡/BPAY处理时间，属于该历史邮件，不视为今天每次操作的承诺。该图也提供非在线交存选择，因此不能把“只有一种线上方式才正规”当结论。

室友或承租人变更时，询问如何同步修改租约和押金名义，不只在室友间私下转账。涉及支付账户、验证链接和个人资料，直接通过已核实的机构处理，不抄用帖子截图里的信息。`,
          `NSW Rental Bonds Online (RBO) and Victoria’s RTBA are different systems. Check tenant, property and amount in an invitation, independently confirm the official service, and follow its requirements. Retain lodgement evidence, bond numbers and notices.

The invitation validity and card/BPAY timing in post 5 concern that historical email, not every current transaction. Its screenshot also describes an offline option, so it does not establish that only one online method is legitimate.

When tenants change, ask how to update both the agreement and bond names rather than only transferring money between housemates. Handle account details, verification links and personal information directly with a verified service, never by copying screenshot details.`
        ),
        t(
          'RBO Rental Bonds Online RTBA 交押金 收据 bond number 室友转名',
          'RBO Rental Bonds Online RTBA lodge bond receipt bond number tenant transfer'
        ),
        ['qrent-handbook:L552-L554', 'collection-03', 'collection-05'],
        ['NSW', 'VIC']
      ),
    ],
  },
  {
    slug: 'moving-in',
    title: t('入住检查与水电网络', 'Moving in, reports and utilities'),
    summary: t(
      '把既有缺陷记进报告，留好影像，再确认账单和服务开通。',
      'Document existing defects, retain evidence and arrange bills and service connections.'
    ),
    relatedPosts: ['rental-inspection', 'types-of-apartments'],
    sections: [
      s(
        'condition-report-checklist',
        t('Condition report 怎么检查', 'Check the condition report'),
        t(
          `领取钥匙后，把中介或房东提供的房屋状况报告逐项与现场比对。照片按房间、项目和日期命名，保留清晰原件；在报告里写明已有的不洁、损坏或未正常运行的设施。

- 墙面与天花板：裂缝、油渍、水印、霉斑、掉漆；镜边、门框和门后不要漏。
- 地面与窗帘：地毯破损/翘边、地板划痕、卷帘放下后的污渍、纱窗和窗锁。
- 厨卫：灶台、抽油烟机、排气扇、水压和排水、马桶、洗碗机，毛巾架与淋浴支架等小件。
- 洗衣与电器：洗衣机/烘干机运转、排水及已有问题；不能测试的项目标明原因。
- 高处窗台与清洁死角：拍照并注明既有状态；记录现状不意味着免除合同中的合理清洁责任。

签字、回传并留存自己的副本。入住报告和退租检查要能逐项对应，不能只把照片留在手机里却不向管理方说明问题。`,
          `After receiving the keys, compare the supplied condition report item by item with the home. Name photographs by room, item and date, retain clear originals, and note existing dirt, damage and faulty equipment in the report.

- Walls/ceilings: cracks, grease, water marks, mould and paint, including mirrors, frames and behind doors.
- Floors/blinds: carpet damage, lifting edges, scratches, lowered blinds, screens and window locks.
- Kitchen/bathroom: cooktop, extractor, fan, water pressure/drainage, toilet, dishwasher and small fittings.
- Laundry/appliances: operation, drainage and existing faults; explain items that could not be tested.
- High ledges/cleaning corners: record the starting condition. Documentation does not remove reasonable cleaning obligations.

Sign, return and retain your copy. Entry and exit records should be comparable. Keeping photos only on your phone does not tell the manager about a problem.`
        ),
        t(
          'condition report 入住检查报告 既有损坏 拍照 留证 霉斑 检查清单',
          'condition report move in existing damage photos evidence mould checklist'
        ),
        ['qrent-handbook:L560-L568', 'collection-01', 'collection-04']
      ),
      s(
        'state-report-deadlines',
        t('回交期限按州确认', 'Return deadlines depend on the state'),
        t(
          `核对本次整理时的官方页面：NSW 要在入住后七天内回交已完成的报告副本；VIC 是入住后五个工作日内。两者不是同一口径，VIC 的工作日不含周末和公众假期。

提前安排检查与送达时间，保留回传邮件或提交凭证。原收藏里“一月内 report”等说法不用于当前操作；其他州或其他类型住宿合同，使用其对应的官方规则。`,
          `At this review, NSW guidance requires the completed report copy within seven days of moving in. Victoria requires it within five business days, excluding weekends and public holidays.

Allow time to inspect and deliver it, and retain submission evidence. The collection’s historical “within a month” wording is not used as a current deadline. Check the applicable guidance for another state or accommodation agreement.`
        ),
        t(
          'condition report 几天 七天 五个工作日 NSW VIC 期限',
          'condition report deadline seven days five business days NSW Victoria'
        ),
        ['collection-01', 'collection-04'],
        ['NSW', 'VIC'],
        'official-rule',
        ['nsw-condition-report', 'vic-condition-report']
      ),
      s(
        'utilities-and-water',
        t('冷水、热水、电气和网络分开问', 'Separate water, energy and internet questions'),
        t(
          `NSW 冷水不是一概免费。官方指引对可向租客转收的用水费设有独立计量、节水措施等条件；用水费也不同于供水和污水服务固定费用。签约前按当前规则、计量方式和合同逐项核对，不能只听“包水”两个字。

水、电、燃气、热水、网络分别确认：

1. 由谁开户、谁付款，是否包含在租金；有无 embedded network 或集中热水。
2. 起租日、开通时间、表读数、账户姓名；保留入住日记录，避免把前住户使用算到自己名下。
3. 网络是否已有服务、路由器/接口是否适配、是否有开通或退订费用。
4. 公共洗衣烘干、停车和其他设施是否另收费。

原攻略列过 EnergyAustralia、Origin、AGL 等能源商和 Telstra、Optus、TPG 等网络商；这是查找入口，不表示每个地址都能选择它们或它们当前最便宜。原文“人均每月约$100 bills”仅是旧经验，不替代实际账单预算。`,
          `Cold water is not universally free in NSW. Official guidance imposes conditions such as separate metering and water efficiency on passing usage charges to tenants. Usage differs from fixed supply and sewerage charges. Check current rules, meters and the agreement rather than relying on “water included”.

Ask separately about water, electricity, gas, hot water and internet:

1. Who opens/pays each account, what rent includes, and whether an embedded network or central hot water applies.
2. Start/connection dates, meter readings and account names; record the entry date to distinguish prior use.
3. Existing internet, compatible equipment and connection/cancellation charges.
4. Extra laundry, parking or facility fees.

EnergyAustralia, Origin, AGL, Telstra, Optus and TPG in the old handbook are starting points, not proof of availability or best prices at every address. Its roughly $100 per-person monthly bills example is historical, not an actual budget quote.`
        ),
        t(
          '水电网 bills 冷水免费 冷水收费 是否包水 水费 热水 embedded network 电 燃气 网络 账单',
          'utilities bills cold water free water usage hot water embedded network electricity gas internet'
        ),
        ['qrent-handbook:L557-L578', 'collection-10', 'collection-18'],
        ['NSW'],
        'official-rule',
        ['nsw-water']
      ),
    ],
  },
  {
    slug: 'repairs-and-moving-out',
    title: t('维修、退租与争议', 'Repairs, moving out and disputes'),
    summary: t(
      '先留证和书面沟通，再按所在州的维修、通知与押金流程处理。',
      'Keep evidence and written communication, then use the state’s repair, notice and bond process.'
    ),
    relatedPosts: ['rental-inspection', 'rental-application-results'],
    sections: [
      s(
        'repair-records',
        t('维修先建立清楚的记录', 'Keep a clear repair record'),
        t(
          `发现问题时记录日期、房间、故障现象、照片及是否影响安全，及时书面通知管理方；紧急问题同时查看租约的紧急维修联系人和本州指引。保存邮件、报修编号、对方回复与预约记录。

维修、维护和损坏责任要结合故障原因、合同和适用规则判断，不把所有设备问题都自动归租客，也不把帖子里的个案直接当法律结论。对未完成的维修持续留痕，必要时向对应租客咨询服务求助。

具体紧急维修权限、垫付金额和期限应查所在地官方说明，不同州不可混用。`,
          `Record the date, room, fault, photographs and any safety impact, then notify the manager in writing. For urgent issues, also check the lease’s emergency contacts and state guidance. Retain report numbers, replies and appointments.

Responsibility depends on the cause, agreement and applicable rules. Do not automatically assign every equipment fault to the tenant or treat a personal post as a legal ruling. Keep records of unresolved repairs and seek the relevant tenant advice service if needed.

Check official local rules for urgent-repair authority, reimbursement amounts and deadlines; do not transfer them between states.`
        ),
        t(
          '维修 报修 紧急维修 房东不修 留证 repair maintenance',
          'repairs maintenance urgent repairs landlord not repairing evidence'
        ),
        ['qrent-handbook:L580-L582', 'collection-02'],
        ['Australia']
      ),
      s(
        'exit-and-bond',
        t('退租与押金准备', 'Prepare for moving out and a bond claim'),
        t(
          `先核对租约类型、结束方式、所需通知及提前解约条款，再安排搬家、清洁、钥匙归还与最终检查。收藏第3篇的“21–28天”通知示例不能跨州、跨租约直接套用。

- 留存书面退租通知、收件证明、入住报告和相同角度的退房照片。
- 核对租金、账单、钥匙、家具和最终表读数，询问如何关停或转移账户。
- 对扣款要求索取项目和依据，保留异议及沟通记录，不签自己不同意的退款分配。
- 使用对应州的押金机构流程；NSW 租客也有通过 RBO 发起或回应退款申请的路径，不是只能等待中介操作。

原帖“48小时到账”不是所有退款的时效保证。室友变更、争议或提前退租另有程序，按实际情况查询。`,
          `Check agreement type, how it ends, notice and early-termination terms before arranging moving, cleaning, keys and final inspection. Post 3’s historical 21–28 day notice example cannot be applied across states and leases.

- Keep written notice, delivery evidence, the entry report and comparable exit photos.
- Reconcile rent, bills, keys, furniture and final readings, and ask about closing/transferring services.
- Request the basis for deductions, preserve objections and do not sign an allocation you dispute.
- Use the state’s bond process. NSW tenants can also initiate or respond to refund claims through RBO; they do not always have to wait for the agent.

The old “48 hour refund” is not a universal guarantee. Tenant changes, disputes and early departures require the applicable process.`
        ),
        t(
          '退租 bond refund 退押金 提前解约 通知期 清洁 扣款',
          'moving out bond refund early termination notice cleaning deductions'
        ),
        ['collection-03', 'collection-04', 'collection-05'],
        ['NSW', 'VIC'],
        'editorial-guide',
        ['nsw-bond-refund', 'vic-renting-rights']
      ),
      s(
        'dispute-help',
        t('先按州找咨询和争议渠道', 'Find advice and dispute routes by state'),
        t(
          `发生争议时，把租约、押金/租金收据、condition report、照片及沟通按时间排序，明确争议金额、发生经过和希望解决的问题。先与对方清楚沟通，必要时使用所在地的咨询或投诉途径。

NSW Fair Trading 提供免费的租赁投诉服务，但不能解决所有事项；Tenants Advice and Advocacy Services 可提供相应租客帮助。需要进一步裁决时，核对 NCAT 的受理范围、时限及费用。VIC 使用对应的 Consumer Affairs Victoria / VCAT 路径，不能把 NSW 机构当作维州渠道。

收藏第2篇主要是 ACT 经验，列举各州机构供定位；其中“四周绝对上限”“一告一个准”和具体罚款说法不作为通用规则。免费投诉服务不等于所有仲裁、诉讼或法律服务都免费，也不保证结果。`,
          `Arrange the lease, bond/rent receipts, condition reports, photographs and correspondence chronologically. Identify the disputed amount, events and desired resolution, communicate clearly, then use the relevant local advice or complaint route.

NSW Fair Trading has a free tenancy complaint service but cannot resolve every matter. Tenants Advice and Advocacy Services offer relevant assistance. Check NCAT’s jurisdiction, deadlines and fees if a determination is needed. Victoria has its own Consumer Affairs Victoria/VCAT routes.

Post 2 mainly concerns ACT. Its absolute bond limits, guaranteed-win language and fine amounts are not universal rules. A free complaint service does not mean every tribunal proceeding or legal service is free, nor does it guarantee an outcome.`
        ),
        t(
          '租房维权 纠纷 投诉 免费咨询 Fair Trading NCAT VCAT ACT 押金不退',
          'tenant rights dispute complaint free advice Fair Trading NCAT VCAT ACT bond withheld'
        ),
        ['collection-02', 'collection-03'],
        ['NSW', 'VIC', 'ACT'],
        'editorial-guide',
        ['nsw-disputes', 'nsw-free-complaints', 'vic-renting-rights']
      ),
    ],
  },
];
