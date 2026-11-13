import { APICallError, generateText, stepCountIs, tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';
import { areaName, RENTAL_SCHOOLS } from '../rental-schools';
import { formatRentalAnswer } from './answers';
import type { AssistantEvidence, ChatReply, RentalLetterType } from './contracts';
import { retrieveGuides } from './guides';
import { faqSections } from './faq';
import { groundedGuidance, guidanceInstructions } from './grounded-guidance';
import {
  isGuideFollowUp,
  isRentalDraft,
  practicalGuideSections,
  practicalGuideTopic,
  rentalRuleTopic,
} from './guide-topics';
import { practicalRentalAnswer, reviewedRentalAnswer } from './reviewed-answers';
import { generateRentalLetter, rentalLetterContext } from './letters';
import { createListingSearch } from './listings';
import type { connectModel } from './model';
import {
  listingScenarios,
  searchChanges,
  searchContextInput,
  type SearchContext,
} from './search-context';

const guideIntent =
  /申请|材料|担保|租房(?:历史|史|记录)|看房(?!源)|押金|退租|维修|漏水|报修|租约|租房流程|防骗|骗局|合租|整租|室友|水电|账单|入住报告|房屋状况|起租日|\b(?:apply|applications?|inspections?|leases?|bonds?|guarantor|repairs?|roommates?|housemates?|utilities|bills|scam)\b|condition report|available date|rental history|credit history|renting process|water leak|mov(?:e|ing) out/i;
const listingIntent =
  /房源|找房|查(?:一下|一下子)?房|租金(?:多少|大概|对比)|周租(?:多少|大概|各|对比)|周租|通勤|\b(?:listings?|rentals?|bedrooms?|commute)\b|asking rents?|weekly rents?|per week|\/wk/i;
const refineIntent =
  /改到|改成|换成|只看|再找|再查|还有吗|还有别的|一样的条件|同样条件|更便宜|不限|取消|分钟|\b(?:what about|how about|same filters|more options|cheaper|instead|only|remove|drop)\b/i;
const alternateAreas =
  /也可以(?:看|考虑)(?:周边|附近|其他区)|(?:没有|没找到|太少).*(?:周边|附近|其他区)|\b(?:nearby|other) (?:suburbs|areas) (?:are|would be) (?:ok|fine)|\bif (?:none|nothing|needed).*(?:nearby|other areas)/i;
const areaComparison =
  /哪些区|对比.*(?:区|区域)|区域.*(?:比较|对比)|\b(?:compare|which|best)\b.*\b(?:suburbs?|areas?|neighbou?rhoods?)\b/i;
const roomSearch =
  /(?:找|租|要|只看)(?:一?[个间])?(?:单间|独立卧室|合租房间)|\b(?:rent|find|looking for) (?:a )?(?:private |shared )?room\b/i;
const resetSearch = /重新找|换个需求|新的搜索|\b(?:new search|start over|start from scratch)\b/i;
const areaMarket =
  /不同(?:区|区域).*(?:租金|房租)|(?:租金|房租).*(?:各区|不同区)|\b(?:rents?|rental prices?).*(?:by|across) (?:suburbs?|areas?)\b/i;
const commuteIntent = /通勤|公交|公共交通|地铁|火车|\b(?:commute|transit|transport|bus|train)\b/i;

const instructions = [
  'You are 小 Q · AI 找房 (Little Q), a practical bilingual rental adviser for Qrent. Answer in the language of the latest question, or the requested language when drafting. Start with the answer. Give concrete next steps and ask one targeted question only when information is needed to proceed. Avoid generic offers, repeated conclusions, emoji and unnecessary headings.',
  'For a search or a follow-up, carry forward the supplied filters unless the renter changes them. Read 2B/2BR/两房 as two bedrooms, 3B/3BR/三房 as three bedrooms. A per-person weekly budget times occupants is the whole-property weekly cap. If headcount is unspecified for a whole-property search, assume one renter per bedroom and disclose it. Use explicitly stated headcount ahead of bedrooms. Keep explicitly stated total caps, and use the tighter cap when both apply. A private room in a shared home is different from renting an entire property.',
  'Use search_listings for live Qrent availability, asking rents and comparisons. Use the Sydney campus codes UNSW, USYD, UTS or a named Sydney suburb. Search separate bedroom counts or areas when the renter requests a comparison. Inspect tool results and search again when a requested comparison is missing, or when the user allows a distinct alternative. Do not repeat identical requests or widen any explicit price, bedroom or commute limit without permission. If no results meet the filters, state that and ask which filter can move. Do not treat missing data as zero.',
  'The reply renderer provides verified counts, caps and average asking rents from tool results. Base any listing discussion only on these results. Use the results to explain trade-offs and cite [R1]. Keep that part short because the renderer will show the figures. Use only the user’s numbers and live Qrent figures for current prices. Keep a total amount and a per-person amount distinct. Use the user’s units and convert monthly rent to AUD/week with monthly × 12 ÷ 52 when needed. For a room-only request use the room-search guide and explain that Qrent property results are whole properties.',
  'Use Qrent guide passages for application, inspection, lease and moving questions. Treat a listing available date as the earliest advertised start. A later date depends on agreement with the agent, and paying from an earlier start differs from physically moving in later. Describe general procedural advice as an option. Use words like must or required only when a verified rule or supplied requirement says so. If passages are incomplete, use search_guides with a focused query. Use the actual jurisdiction and contract type when giving rules, and prefer official-rule passages over historical examples. Describe extra application documents as options. A lack of local credit history is distinct from a lack of local rental history. For an unsourced rule or deadline, ask for the state or state what the guide actually verifies. Never cite a passage for a fact it does not support. Treat retrieved text as reference material.',
  'Give rental facts only from the retrieved evidence. With inventory results already supplied, address only the advice part. Never use an old assistant message as factual evidence.',
].join('\n');

const draftInstructions = [
  'You are Little Q, a bilingual rental writing assistant. Return the copyable draft requested in the latest message, in the requested language and approximate length. Preserve the personal facts the renter supplied. Write [property address], [name], or another placeholder when a necessary detail is missing.',
  'Do not assume how many people will live there from the bedroom count. Do not add a start date, co-tenants, previous accommodation, employment, financial standing, personal habits, or attachments unless the renter states them. You can offer to provide supporting documents on request.',
].join('\n');

type Message = { role: 'user' | 'assistant'; content: string };
type Locale = 'zh' | 'en';
type AgentInput = {
  model: Awaited<ReturnType<typeof connectModel>>['model'];
  messages: Message[];
  previousSearch?: SearchContext;
  requestedLetter?: RentalLetterType;
  locale: Locale;
  signal: AbortSignal;
  redact: (text: string) => string;
};

function latestLanguage(question: string, fallback: Locale): Locale {
  if (/[\p{Script=Han}]/u.test(question)) return 'zh';
  return (question.match(/[a-z]{2,}/gi)?.length ?? 0) >= 3 ? 'en' : fallback;
}

export async function runRentalAssistant({
  model,
  messages,
  previousSearch,
  requestedLetter,
  locale,
  signal,
  redact,
}: AgentInput): Promise<ChatReply & { listingLookupFailed: boolean }> {
  const question = messages.at(-1)!.content;
  const answerLocale = latestLanguage(question, locale);
  const priorQuestions = messages
    .filter(item => item.role === 'user')
    .slice(0, -1)
    .reverse();
  const previousUserQuestion = priorQuestions[0]?.content;
  const letter = rentalLetterContext(
    [...priorQuestions.map(item => item.content).reverse(), question],
    requestedLetter
  );
  const drafting = Boolean(letter) || isRentalDraft(question);
  const currentRule = rentalRuleTopic(question);
  const followUpTopic =
    !currentRule && isGuideFollowUp(question)
      ? priorQuestions.find(item => rentalRuleTopic(item.content))?.content
      : undefined;
  const practicalTopic = practicalGuideTopic(question, previousUserQuestion);
  const priorGuide =
    !drafting && !currentRule && isGuideFollowUp(question)
      ? priorQuestions.find(
          item =>
            practicalGuideSections(item.content).length ||
            faqSections(item.content).length ||
            guideIntent.test(item.content)
        )?.content
      : undefined;
  const guideQuery =
    currentRule || followUpTopic || practicalTopic || practicalGuideSections(question).length
      ? question.slice(0, 350)
      : question
          .split(/[。？！!?\n]+/)
          .filter(part => guideIntent.test(part) || faqSections(part).length)
          .join(' ')
          .trim()
          .slice(0, 220);
  const change = searchChanges(question);
  if (change.school && !change.suburbs?.length && areaComparison.test(question)) {
    const campus = RENTAL_SCHOOLS.find(item => item.code === change.school);
    change.suburbs = campus?.areas.slice(0, 3).map(areaName);
  }
  const previous = resetSearch.test(question) ? undefined : previousSearch;
  const namedLocation = Boolean(change.school || change.suburbs?.length);
  const requestedBeds = Boolean(change.bedrooms || change.bedroomOptions);
  const budgetChange = change.perPersonRent !== undefined || change.maxRent !== undefined;
  const directListingRequest =
    listingIntent.test(question) &&
    (!guideQuery ||
      requestedBeds ||
      areaMarket.test(question) ||
      (namedLocation &&
        /房源|找房|查房|\b(?:find|compare|listings?)\b/i.test(question) &&
        !currentRule &&
        !followUpTopic &&
        !practicalTopic));
  const refining =
    Boolean(previous) &&
    (requestedBeds ||
      (!guideQuery &&
        (budgetChange || Object.keys(change).length > 0 || refineIntent.test(question))));
  const roomOnly =
    !drafting &&
    roomSearch.test(question) &&
    !/(?:也|对比|同时).*(?:整租|整套)|\b(?:compare|also).*whole[- ]propert/i.test(question);
  const listingQuestion =
    !drafting &&
    !roomOnly &&
    (refining ||
      directListingRequest ||
      (requestedBeds && namedLocation) ||
      (!guideQuery && (requestedBeds || budgetChange)));
  const alternativeAreasAllowed = alternateAreas.test(question);
  const prior = listingQuestion ? previous : undefined;
  const movingCampus = change.school && prior?.school && change.school !== prior.school;
  const focused: SearchContext = {
    ...prior,
    ...(movingCampus ? { suburbs: [] } : {}),
    ...change,
  };
  const canSearch = Boolean(focused.school || focused.suburbs?.length);
  const needsMarketScope = !drafting && areaMarket.test(question) && !canSearch;
  const missingHeadcount = Boolean(
    focused.perPersonRent && !(focused.occupants || focused.bedrooms || focused.bedroomOptions)
  );
  const requireListings = listingQuestion && canSearch && !missingHeadcount;
  const commuteRequested =
    commuteIntent.test(question) || (refining && Boolean(focused.maxCommute));

  const evidence: AssistantEvidence[] = [];
  const listingLookup = { requested: requireListings, failed: false, failedAreas: [] as string[] };
  const inventory = createListingSearch(answerLocale, signal);
  let search: SearchContext | undefined =
    listingQuestion && Object.keys(focused).length ? focused : undefined;
  let completedSearch = false;
  let listingCalls = 0;
  let guideCalls = 0;
  const guideQueries = new Map<string, ReturnType<typeof lookupGuides>>();
  const guideContext = {
    school: change.school ?? previous?.school,
    previousUserQuestion,
    previousTopicQuestion: followUpTopic ?? priorGuide,
  };

  function lookupGuides(query: string) {
    const retrieved = retrieveGuides(query, answerLocale, guideContext);
    return {
      ...retrieved,
      passages: retrieved.passages.map(passage => {
        const known = evidence.find(
          item => item.kind === 'guide' && item.path === passage.path && item.text === passage.text
        );
        const id = known?.id ?? 'G' + (1 + evidence.filter(item => item.kind === 'guide').length);
        if (!known) evidence.push({ ...passage, id, kind: 'guide' });
        return { ...passage, id, path: undefined };
      }),
    };
  }

  const firstGuideQuery = letter
    ? letter.type === 'cover'
      ? 'cover letter'
      : 'parent support letter guarantor'
    : roomOnly && !guideQuery
      ? answerLocale === 'zh'
        ? 'Flatmates 找合租单间'
        : 'Flatmates private room'
      : guideQuery || (priorGuide ? question.slice(0, 160) : '');
  const preloaded = firstGuideQuery ? lookupGuides(firstGuideQuery) : undefined;
  if (preloaded) guideQueries.set(firstGuideQuery.toLowerCase(), preloaded);

  const guideEvidence = evidence.filter(item => item.kind === 'guide');
  const sourcedAnswer =
    letter || !preloaded
      ? undefined
      : preloaded.topic && !listingQuestion
        ? reviewedRentalAnswer({
            topic: preloaded.topic,
            jurisdictions: preloaded.jurisdictions,
            passages: guideEvidence,
            locale: answerLocale,
            question: followUpTopic ? question + '\n' + followUpTopic : question,
          })
        : drafting
          ? undefined
          : practicalRentalAnswer(question, answerLocale, guideEvidence, previousUserQuestion);
  const citedGuides = guideEvidence.filter(item => sourcedAnswer?.includes('[' + item.id + ']'));
  if (sourcedAnswer && !listingQuestion)
    return { answer: sourcedAnswer, evidence: citedGuides, listingLookupFailed: false };
  if (roomOnly && !guideQuery) {
    const roomGuide = guideEvidence.find(item => item.path.endsWith('#room-search'));
    if (roomGuide) {
      const answer =
        answerLocale === 'zh'
          ? '想找合租单间，可以在 Flatmates 的 Rooms 里按区域和预算筛 private room。核对是否包账单、卫浴是否共享，以及谁有权出租。Qrent 的房源搜索提供整套房源。'
          : 'For a room in a shared home, filter Flatmates Rooms by area and budget and look for a private room. Check bill inclusions, bathroom sharing and who can let the room. Qrent searches whole-property listings.';
      return {
        answer: answer + ' [' + roomGuide.id + ']',
        evidence: [roomGuide],
        listingLookupFailed: false,
      };
    }
  }
  if (letter) {
    const draft = await generateRentalLetter({ model, ...letter, signal, redact });
    const anchor = letter.type === 'cover' ? '#cover-letter' : '#parent-letter-and-history';
    return {
      ...draft,
      letterType: letter.type,
      evidence: guideEvidence.filter(item => item.path.endsWith(anchor)).slice(0, 1),
      listingLookupFailed: false,
    };
  }
  if (drafting) {
    if (!guideEvidence.length)
      return { ...groundedGuidance('', [], answerLocale), listingLookupFailed: false };
    const result = await generateText({
      model,
      system:
        draftInstructions +
        '\nUse only user facts and these guide passages for rental claims. Omit unverified rules and numbers.\n' +
        JSON.stringify(preloaded),
      messages: messages.filter(message => message.role === 'user'),
      maxOutputTokens: 560,
      maxRetries: 0,
      abortSignal: signal,
    });
    const answer = redact(result.text.trim());
    return {
      answer,
      evidence: answer ? guideEvidence : [],
      modelId: result.response.modelId,
      listingLookupFailed: false,
    };
  }

  async function lookupListings(input: SearchContext) {
    if (roomOnly)
      return {
        clarification: 'Qrent listings are whole properties. Use the room-search guide.',
      };
    if (++listingCalls > 4) return { error: 'Use the listing results already returned.' };
    const effective: SearchContext = {
      ...focused,
      ...input,
      ...(input.bedrooms != null && input.bedroomOptions === undefined
        ? { bedroomOptions: null }
        : {}),
      ...change,
    };
    if (alternativeAreasAllowed && completedSearch && input.suburbs?.length)
      effective.suburbs = input.suburbs;
    if (refining && change.bedrooms === undefined && change.bedroomOptions === undefined) {
      effective.bedrooms = prior?.bedrooms;
      effective.bedroomOptions = prior?.bedroomOptions;
    }
    if (refining && !movingCampus && change.suburbs === undefined && !alternativeAreasAllowed)
      effective.suburbs = prior?.suburbs;
    if (refining && change.school === undefined) effective.school = prior?.school;
    if (prior?.minRent != null && change.minRent === undefined)
      effective.minRent = Math.max(prior.minRent, effective.minRent ?? prior.minRent);
    if (prior?.maxRent != null && change.maxRent === undefined)
      effective.maxRent = Math.min(prior.maxRent, effective.maxRent ?? prior.maxRent);
    if (prior?.perPersonRent != null && change.perPersonRent === undefined)
      effective.perPersonRent = prior.perPersonRent;
    if (prior?.perPersonMinRent != null && change.perPersonRent === undefined)
      effective.perPersonMinRent = prior.perPersonMinRent;
    // Occupancy comes from the renter. A model can mistake a prior
    // one-person-per-bedroom assumption for the actual household size.
    effective.occupants = focused.occupants;
    if (prior?.maxCommute != null && change.maxCommute === undefined)
      effective.maxCommute = Math.min(prior.maxCommute, effective.maxCommute ?? prior.maxCommute);
    if (!effective.school && !effective.suburbs?.length)
      return { clarification: 'Ask for the renter’s campus or a Sydney suburb.' };
    if (effective.perPersonRent == null) effective.perPersonMinRent = null;
    const plans = listingScenarios(effective);
    if (!plans.length)
      return {
        clarification: 'Ask how many people share the rent or which bedroom count to search.',
      };

    listingLookup.requested = true;
    const lookedUp = await Promise.all(
      plans.map(async plan => ({
        ...plan,
        found: await inventory.search(plan.input),
      }))
    );
    return lookedUp
      .map(({ split, found }) => {
        if ('error' in found) {
          listingLookup.failed = true;
          return [found];
        }
        return found.regions.map(region => {
          if ('error' in region) {
            listingLookup.failed = true;
            const area = region.suburb ? areaName(region.suburb) : region.school;
            if (area && !listingLookup.failedAreas.includes(area))
              listingLookup.failedAreas.push(area);
            return region;
          }
          if (!completedSearch) {
            search = effective;
            completedSearch = true;
          }
          const known = evidence.find(
            item =>
              item.kind === 'listings' &&
              item.school === region.school &&
              item.suburb === region.suburb &&
              JSON.stringify(item.filters) === JSON.stringify(region.filters)
          );
          const id =
            known?.id ?? 'R' + (1 + evidence.filter(item => item.kind === 'listings').length);
          if (!known) evidence.push({ ...region, split, id, kind: 'listings' });
          return {
            id,
            school: region.school,
            suburb: region.suburb,
            matches: region.matches,
            averageWeeklyRent: region.averageWeeklyRent,
            filters: region.filters,
            split,
            examples: region.examples.map(({ address, weeklyRent, bedrooms, commuteMinutes }) => ({
              address,
              weeklyRent,
              bedrooms,
              commuteMinutes: commuteRequested ? commuteMinutes : undefined,
            })),
          };
        });
      })
      .flat();
  }

  const tools = {
    search_listings: tool({
      description:
        'Search the Qrent property API. Use bedroomOptions for a comparison such as [2, 3] and suburbs for a comparison with the same filters. For per-person budgets send perPersonRent; the tool computes the whole-property cap.',
      inputSchema: searchContextInput,
      execute: lookupListings,
    }),
    search_guides: tool({
      description:
        'Find focused, citable Qrent guide passages and reviewed FAQ answers on Australian renting. Include the state when known. Use a new query if the previous results do not answer the question.',
      inputSchema: z.object({ query: z.string().trim().min(2).max(220) }),
      execute: async ({ query }) => {
        const key = query.toLowerCase();
        const known = guideQueries.get(key);
        if (known) return known;
        if (++guideCalls > 2) return { error: 'Use the guide passages already returned.' };
        const result = lookupGuides(query);
        guideQueries.set(key, result);
        return result;
      },
    }),
  };

  // Explicit filters can go directly to inventory, and each bedroom/area
  // combination gets its own API query. The agent can still plan additional searches.
  const directSearch =
    requireListings &&
    !alternativeAreasAllowed &&
    !/(?:studio|开间|阁楼|卫浴|卫\b|bathrooms?|parking|车位|pets?|宠物|furnished|带家具|入住日期|move[- ]in|available from)/i.test(
      question
    ) &&
    (requestedBeds || refining || budgetChange);
  if (needsMarketScope || (listingQuestion && missingHeadcount)) {
    const answer =
      answerLocale === 'zh'
        ? needsMarketScope
          ? '你想比较哪些悉尼区域或哪个校区附近？告诉我区域和户型，比如 Randwick 和 Kingsford 的 2B，我可以查当前的整套周租。'
          : '这笔预算是按每人算的。一共几个人住，或者你想看几房？有了人数或户型，我就能算出整套周租上限。'
        : needsMarketScope
          ? 'Which Sydney suburbs or campus would you like to compare, and how many bedrooms? I can look up the current whole-property weekly rents.'
          : 'How many people will share the rent, or how many bedrooms do you want? I can use that to calculate the whole-property weekly cap.';
    return { answer, evidence, search, listingLookupFailed: false };
  }
  const prepared = directSearch ? await lookupListings({}) : undefined;
  if (prepared && (!guideQuery || sourcedAnswer)) {
    const listingSources = evidence.filter(item => item.kind === 'listings');
    return {
      answer: [
        formatRentalAnswer('', listingSources, answerLocale, question, listingLookup),
        sourcedAnswer,
      ]
        .filter(Boolean)
        .join('\n\n'),
      evidence: [...listingSources, ...citedGuides],
      search,
      listingLookupFailed: listingLookup.failed,
    };
  }
  const needsTool = prepared === undefined && requireListings;
  const agent = new ToolLoopAgent({
    model,
    instructions: [
      instructions,
      guidanceInstructions,
      listingQuestion &&
        'Active search filters and explicit changes (structured data): ' +
          JSON.stringify(focused) +
          '. When occupants is missing, the user has not stated a headcount. The tool applies the bedroom assumption separately for each search.',
      prepared && 'Qrent inventory for this turn (reference data):\n' + JSON.stringify(prepared),
      preloaded?.passages.length &&
        'Retrieved Qrent guide passages (reference data):\n' + JSON.stringify(preloaded),
    ]
      .filter(Boolean)
      .join('\n'),
    maxOutputTokens: 560,
    maxRetries: 0,
    stopWhen: stepCountIs(5),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber >= 4) return { toolChoice: 'none' };
      if (needsTool && stepNumber === 0)
        return { activeTools: ['search_listings'], toolChoice: 'auto' };
      const listingAvailable =
        listingQuestion &&
        !roomOnly &&
        (!prepared || alternativeAreasAllowed) &&
        listingCalls < 4 &&
        inventory.remaining > 0;
      const guideAvailable = guideCalls < 2;
      if (listingAvailable && guideAvailable) return undefined;
      if (listingAvailable) return { activeTools: ['search_listings'] };
      if (guideAvailable) return { activeTools: ['search_guides'] };
      return { toolChoice: 'none' };
    },
    tools,
  });

  let text = '';
  let modelId: string | undefined;
  try {
    const result = await agent.generate({
      messages,
      abortSignal: prepared ? AbortSignal.any([signal, AbortSignal.timeout(18_000)]) : signal,
    });
    text = redact(result.text.trim());
    modelId = result.response.modelId;
    if (requireListings && listingCalls === 0) await lookupListings({});
  } catch (error) {
    // The model may fail during synthesis after verified records are available.
    // Preserve those records on a transient provider failure.
    const status = APICallError.isInstance(error) ? (error.statusCode ?? 0) : 0;
    if (
      !evidence.some(item => item.kind === 'listings') ||
      signal.aborted ||
      [401, 403, 429].includes(status)
    )
      throw error;
    console.warn('Little Q returned verified inventory after synthesis failed.');
  }
  const listings = evidence.filter(item => item.kind === 'listings');
  const inventoryAnswer = formatRentalAnswer('', listings, answerLocale, question, listingLookup);
  const needsGuidance = Boolean(guideQuery || priorGuide || roomOnly || !listingQuestion);
  const guidance = needsGuidance ? groundedGuidance(text, evidence, answerLocale) : undefined;
  const answer = [inventoryAnswer, guidance?.answer].filter(Boolean).join('\n\n');
  return {
    answer,
    evidence: [...listings, ...(guidance?.evidence ?? [])],
    search,
    modelId,
    listingLookupFailed: listingLookup.failed,
  };
}
