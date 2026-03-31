import type {
  InsightExplorerViewModel,
  RelationshipMapNodeKind,
  RelationshipMapNodeSubtype,
  RelationshipMapNodeViewModel,
  RelationshipMapViewModel,
} from '../types';

export type RelationshipQuestionId = 'aligned' | 'energy-drain' | 'productive' | 'people';

export type RelationshipMeaningImpactLabel = 'High impact' | 'Medium impact' | 'Low impact';

export type RelationshipMeaningTone = 'positive' | 'negative' | 'neutral';

export type RelationshipMeaningDriverViewModel = {
  nodeId: string;
  label: string;
  kind: RelationshipMapNodeKind;
  subtype: RelationshipMapNodeSubtype;
  score: number;
  impactLabel: RelationshipMeaningImpactLabel;
  explanation: string;
};

export type RelationshipMeaningPatternViewModel = {
  id: string;
  tone: RelationshipMeaningTone;
  text: string;
};

export type RelationshipQuestionViewModel = {
  id: RelationshipQuestionId;
  label: string;
  helper: string;
  targetNodeId: string | null;
};

export type RelationshipMeaningInsightViewModel = {
  nodeId: string;
  kicker: string;
  title: string;
  summary: string;
  focusNodeIds: string[];
  allRelatedNodeIds: string[];
  primaryDrivers: RelationshipMeaningDriverViewModel[];
  secondaryDrivers: RelationshipMeaningDriverViewModel[];
  patterns: RelationshipMeaningPatternViewModel[];
  connectionGroups: RelationshipMeaningConnectionGroupViewModel[];
};

export type RelationshipMeaningConnectionGroupViewModel = {
  id: string;
  title: string;
  items: RelationshipMeaningDriverViewModel[];
};

export type RelationshipMeaningOverviewViewModel = {
  title: string;
  summary: string;
  topPositiveInfluencers: RelationshipMeaningDriverViewModel[];
  topNegativePatterns: RelationshipMeaningDriverViewModel[];
};

export type RelationshipMeaningViewModel = {
  questions: RelationshipQuestionViewModel[];
  overview: RelationshipMeaningOverviewViewModel;
  insightsByNodeId: Record<string, RelationshipMeaningInsightViewModel>;
};

type WeightedConnection = {
  node: RelationshipMapNodeViewModel;
  score: number;
  weight: number;
};

const POSITIVE_STATE_KEYWORDS = /(aligned|calm|reassured|focused|structured|clear|grounded|steady|connected|systematic|precise)/i;
const NEGATIVE_STATE_KEYWORDS = /(drain|drained|exhaust|overload|loop|distract|pressure|deadline|chaos|hunting|time-pressed)/i;
const PRODUCTIVE_STATE_KEYWORDS = /(focused|structured|systematic|clear|aligned|precise)/i;

const lowerFirst = (value: string) => (value.length > 0 ? `${value.slice(0, 1).toLowerCase()}${value.slice(1)}` : value);

const humanList = (values: string[], limit = 3) => {
  const uniqueValues = Array.from(new Set(values.filter(Boolean))).slice(0, limit);
  if (uniqueValues.length === 0) return '';
  if (uniqueValues.length === 1) return uniqueValues[0];
  if (uniqueValues.length === 2) return `${uniqueValues[0]} and ${uniqueValues[1]}`;
  return `${uniqueValues.slice(0, -1).join(', ')}, and ${uniqueValues[uniqueValues.length - 1]}`;
};

const labelForKind = (kind: RelationshipMapNodeKind) => {
  switch (kind) {
    case 'activity':
      return 'Activity';
    case 'entity':
      return 'Entity';
    case 'state':
      return 'State';
    case 'context':
      return 'Context';
    default:
      return kind;
  }
};

const isPositiveNode = (node: RelationshipMapNodeViewModel) =>
  (node.kind === 'state' && node.subtype === 'CONFIDENCE') || (node.kind === 'context' && node.subtype === 'LIKE');

const isNegativeNode = (node: RelationshipMapNodeViewModel) =>
  (node.kind === 'state' && node.subtype === 'UNCERTAINTY') ||
  (node.kind === 'context' && (node.subtype === 'DISLIKE' || node.subtype === 'CONSTRAINT'));

const impactLabelForScore = (score: number, maxScore: number): RelationshipMeaningImpactLabel => {
  if (maxScore <= 0) return 'Low impact';
  const normalized = score / maxScore;
  if (normalized >= 0.72) return 'High impact';
  if (normalized >= 0.4) return 'Medium impact';
  return 'Low impact';
};

const explainInfluence = (focus: RelationshipMapNodeViewModel, driver: RelationshipMapNodeViewModel) => {
  if (focus.kind === 'state') {
    if (driver.kind === 'activity') return `${driver.label} repeatedly leads toward ${lowerFirst(focus.label)}.`;
    if (driver.kind === 'entity') return `${driver.label} is a recurring signal before ${lowerFirst(focus.label)} shows up.`;
    if (driver.kind === 'context') return `${driver.label} changes how strongly ${lowerFirst(focus.label)} appears.`;
  }

  if (focus.kind === 'activity') {
    if (driver.kind === 'state') return `${focus.label} tends to move you toward ${lowerFirst(driver.label)}.`;
    if (driver.kind === 'context') return `${driver.label} is one of the clearest conditions shaping this activity.`;
    if (driver.kind === 'entity') return `${driver.label} consistently shows up around this activity cluster.`;
  }

  if (focus.kind === 'entity') {
    if (driver.kind === 'state') return `${focus.label} tends to push you toward ${lowerFirst(driver.label)}.`;
    if (driver.kind === 'activity') return `${focus.label} matters most when ${lowerFirst(driver.label)} is active.`;
    if (driver.kind === 'context') return `${driver.label} often explains why ${lowerFirst(focus.label)} has so much effect.`;
  }

  if (focus.kind === 'context') {
    if (driver.kind === 'state') return `${focus.label} tends to lead into ${lowerFirst(driver.label)}.`;
    if (driver.kind === 'activity') return `${focus.label} most often appears during ${lowerFirst(driver.label)}.`;
    if (driver.kind === 'entity') return `${driver.label} is frequently present when this context shows up.`;
  }

  return `${driver.label} is one of the clearest influences around this pattern.`;
};

const toDriver = (
  focus: RelationshipMapNodeViewModel,
  connection: WeightedConnection,
  maxScore: number,
): RelationshipMeaningDriverViewModel => ({
  nodeId: connection.node.id,
  label: connection.node.label,
  kind: connection.node.kind,
  subtype: connection.node.subtype,
  score: connection.score,
  impactLabel: impactLabelForScore(connection.score, maxScore),
  explanation: explainInfluence(focus, connection.node),
});

const uniqueConnections = (connections: WeightedConnection[]) => {
  const seen = new Set<string>();
  return connections.filter((connection) => {
    if (seen.has(connection.node.id)) return false;
    seen.add(connection.node.id);
    return true;
  });
};

const byKinds = (connections: WeightedConnection[], kinds: RelationshipMapNodeKind[]) =>
  connections.filter((connection) => kinds.includes(connection.node.kind));

const pickTop = (connections: WeightedConnection[], limit: number) =>
  uniqueConnections(connections)
    .sort((left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label))
    .slice(0, limit);

const buildConnectionGroups = (
  focus: RelationshipMapNodeViewModel,
  connections: WeightedConnection[],
  maxScore: number,
): RelationshipMeaningConnectionGroupViewModel[] => {
  const unique = uniqueConnections(connections).sort(
    (left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label),
  );

  const groups: Array<{
    id: string;
    title: string;
    filter: (connection: WeightedConnection) => boolean;
  }> = [
    {
      id: 'activities',
      title: 'Activities',
      filter: (connection) => connection.node.kind === 'activity',
    },
    {
      id: 'state-confidence',
      title: 'Confidence states',
      filter: (connection) => connection.node.kind === 'state' && connection.node.subtype === 'CONFIDENCE',
    },
    {
      id: 'state-uncertainty',
      title: 'Uncertainty states',
      filter: (connection) => connection.node.kind === 'state' && connection.node.subtype === 'UNCERTAINTY',
    },
    {
      id: 'context-like',
      title: 'Context · Like',
      filter: (connection) => connection.node.kind === 'context' && connection.node.subtype === 'LIKE',
    },
    {
      id: 'context-dislike',
      title: 'Context · Dislike',
      filter: (connection) => connection.node.kind === 'context' && connection.node.subtype === 'DISLIKE',
    },
    {
      id: 'context-constraint',
      title: 'Context · Constraint',
      filter: (connection) => connection.node.kind === 'context' && connection.node.subtype === 'CONSTRAINT',
    },
    {
      id: 'entity-person',
      title: 'People',
      filter: (connection) => connection.node.kind === 'entity' && connection.node.subtype === 'PERSON',
    },
    {
      id: 'entity-location',
      title: 'Locations',
      filter: (connection) => connection.node.kind === 'entity' && connection.node.subtype === 'LOCATION',
    },
    {
      id: 'entity-tool',
      title: 'Tools',
      filter: (connection) => connection.node.kind === 'entity' && connection.node.subtype === 'TOOL',
    },
    {
      id: 'entity-project',
      title: 'Projects',
      filter: (connection) => connection.node.kind === 'entity' && connection.node.subtype === 'PROJECT',
    },
  ];

  return groups
    .map((group) => ({
      id: group.id,
      title: group.title,
      items: unique.filter(group.filter).map((connection) => toDriver(focus, connection, maxScore)),
    }))
    .filter((group) => group.items.length > 0);
};

const summaryForNode = (focus: RelationshipMapNodeViewModel, connections: WeightedConnection[]) => {
  const activities = pickTop(byKinds(connections, ['activity']), 2).map((connection) => lowerFirst(connection.node.label));
  const entities = pickTop(byKinds(connections, ['entity']), 3).map((connection) => connection.node.label);
  const states = pickTop(byKinds(connections, ['state']), 2).map((connection) => lowerFirst(connection.node.label));
  const contexts = pickTop(byKinds(connections, ['context']), 2).map((connection) => lowerFirst(connection.node.label));

  if (focus.kind === 'state') {
    const activityCopy = activities.length > 0 ? `when ${humanList(activities)}` : 'when similar patterns repeat';
    const entityCopy = entities.length > 0 ? `, especially around ${humanList(entities)}` : '';
    return `You move toward ${lowerFirst(focus.label)} most often ${activityCopy}${entityCopy}.`;
  }

  if (focus.kind === 'activity') {
    const stateCopy = states.length > 0 ? humanList(states) : 'your strongest recurring states';
    const contextCopy = contexts.length > 0 ? ` while ${humanList(contexts)} keeps shaping the experience` : '';
    return `${focus.label} tends to lead toward ${stateCopy}${contextCopy}.`;
  }

  if (focus.kind === 'entity') {
    const activityCopy = activities.length > 0 ? `during ${humanList(activities)}` : 'during your most repeated routines';
    const stateCopy = states.length > 0 ? ` and usually nudges you toward ${humanList(states)}` : '';
    return `${focus.label} matters most ${activityCopy}${stateCopy}.`;
  }

  const stateCopy = states.length > 0 ? `toward ${humanList(states)}` : 'toward a clear state shift';
  const activityCopy = activities.length > 0 ? ` when ${humanList(activities)} repeats` : '';
  return `${focus.label} tends to push you ${stateCopy}${activityCopy}.`;
};

const patternsForNode = (focus: RelationshipMapNodeViewModel, connections: WeightedConnection[]) => {
  const topActivities = pickTop(byKinds(connections, ['activity']), 2);
  const topEntities = pickTop(byKinds(connections, ['entity']), 2);
  const topContexts = pickTop(byKinds(connections, ['context']), 2);
  const topStates = pickTop(byKinds(connections, ['state']), 2);
  const patterns: RelationshipMeaningPatternViewModel[] = [];

  if (focus.kind === 'state') {
    if (topActivities[0]) {
      patterns.push({
        id: `${focus.id}:activity-pattern`,
        tone: focus.subtype === 'UNCERTAINTY' ? 'negative' : 'positive',
        text: `${topActivities[0].node.label} leads toward ${lowerFirst(focus.label)} more than the rest of the graph.`,
      });
    }
    if (topContexts[0]) {
      patterns.push({
        id: `${focus.id}:context-pattern`,
        tone: focus.subtype === 'UNCERTAINTY' ? 'negative' : 'positive',
        text: `${topContexts[0].node.label} changes how strongly ${lowerFirst(focus.label)} shows up.`,
      });
    }
    if (topEntities[0]) {
      patterns.push({
        id: `${focus.id}:entity-pattern`,
        tone: focus.subtype === 'UNCERTAINTY' ? 'negative' : 'positive',
        text: `${topEntities[0].node.label} is one of the clearest repeating signals around this state.`,
      });
    }
  } else if (focus.kind === 'activity') {
    if (topStates[0]) {
      patterns.push({
        id: `${focus.id}:state-pattern`,
        tone: isNegativeNode(topStates[0].node) ? 'negative' : 'positive',
        text: `${focus.label} most often leads to ${lowerFirst(topStates[0].node.label)}.`,
      });
    }
    if (topContexts[0]) {
      patterns.push({
        id: `${focus.id}:context-pattern`,
        tone: isNegativeNode(topContexts[0].node) ? 'negative' : 'positive',
        text: `${topContexts[0].node.label} is the strongest condition shaping this activity.`,
      });
    }
  } else if (focus.kind === 'entity') {
    if (topStates[0]) {
      patterns.push({
        id: `${focus.id}:state-pattern`,
        tone: isNegativeNode(topStates[0].node) ? 'negative' : 'positive',
        text: `${focus.label} most often shifts you toward ${lowerFirst(topStates[0].node.label)}.`,
      });
    }
    if (topActivities[0]) {
      patterns.push({
        id: `${focus.id}:activity-pattern`,
        tone: 'neutral',
        text: `${focus.label} has the strongest effect when ${lowerFirst(topActivities[0].node.label)} is active.`,
      });
    }
  } else if (focus.kind === 'context') {
    if (topStates[0]) {
      patterns.push({
        id: `${focus.id}:state-pattern`,
        tone: isNegativeNode(topStates[0].node) ? 'negative' : 'positive',
        text: `${focus.label} tends to lead into ${lowerFirst(topStates[0].node.label)}.`,
      });
    }
    if (topEntities[0]) {
      patterns.push({
        id: `${focus.id}:entity-pattern`,
        tone: 'neutral',
        text: `${topEntities[0].node.label} keeps appearing when this condition is present.`,
      });
    }
  }

  return patterns.slice(0, 3);
};

const buildInsightForNode = (focus: RelationshipMapNodeViewModel, connections: WeightedConnection[]) => {
  const sortedConnections = uniqueConnections([...connections]).sort(
    (left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label),
  );
  const maxScore = sortedConnections[0]?.score ?? 1;
  const allRelatedNodeIds = sortedConnections.map((connection) => connection.node.id);

  const primaryPool =
    focus.kind === 'state'
      ? [...byKinds(sortedConnections, ['activity']), ...byKinds(sortedConnections, ['entity']), ...byKinds(sortedConnections, ['context'])]
      : focus.kind === 'activity'
        ? [...byKinds(sortedConnections, ['state']), ...byKinds(sortedConnections, ['context']), ...byKinds(sortedConnections, ['entity'])]
        : focus.kind === 'entity'
          ? [...byKinds(sortedConnections, ['state']), ...byKinds(sortedConnections, ['activity']), ...byKinds(sortedConnections, ['context'])]
          : [...byKinds(sortedConnections, ['state']), ...byKinds(sortedConnections, ['activity']), ...byKinds(sortedConnections, ['entity'])];

  const secondaryPool =
    focus.kind === 'state' || focus.kind === 'activity'
      ? sortedConnections.filter((connection) => connection.node.kind === 'entity')
      : sortedConnections.filter((connection) => connection.node.kind !== focus.kind);

  const primaryDrivers = pickTop(primaryPool, 3).map((connection) => toDriver(focus, connection, maxScore));
  const secondaryDrivers = pickTop(secondaryPool, 4).map((connection) => toDriver(focus, connection, maxScore));

  return {
    nodeId: focus.id,
    kicker: `${labelForKind(focus.kind).toUpperCase()}: ${focus.label.toUpperCase()}`,
    title: focus.label,
    summary: summaryForNode(focus, sortedConnections),
    focusNodeIds: [focus.id, ...sortedConnections.slice(0, 6).map((connection) => connection.node.id)],
    allRelatedNodeIds,
    primaryDrivers,
    secondaryDrivers,
    patterns: patternsForNode(focus, sortedConnections),
    connectionGroups: buildConnectionGroups(focus, sortedConnections, maxScore),
  } satisfies RelationshipMeaningInsightViewModel;
};

const buildConnectionMap = (graph: RelationshipMapViewModel) => {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const connectionMap = new Map<string, WeightedConnection[]>();

  graph.edges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;

    const forwardScore = edge.weight * 1.35 + target.importance * 0.45 + target.frequency * 0.15;
    const reverseScore = edge.weight * 1.35 + source.importance * 0.45 + source.frequency * 0.15;

    const sourceConnections = connectionMap.get(source.id) ?? [];
    sourceConnections.push({ node: target, score: forwardScore, weight: edge.weight });
    connectionMap.set(source.id, sourceConnections);

    const targetConnections = connectionMap.get(target.id) ?? [];
    targetConnections.push({ node: source, score: reverseScore, weight: edge.weight });
    connectionMap.set(target.id, targetConnections);
  });

  return connectionMap;
};

const matchNodeByKeyword = (
  nodes: RelationshipMapNodeViewModel[],
  matcher: RegExp,
  predicate?: (node: RelationshipMapNodeViewModel) => boolean,
) =>
  nodes
    .filter((node) => matcher.test(node.label) && (predicate ? predicate(node) : true))
    .sort((left, right) => right.importance - left.importance || left.label.localeCompare(right.label))[0] ?? null;

const activityWorkScore = (activity: InsightExplorerViewModel['activityGroups'][number]) => {
  const workTagBonus = activity.tags.includes('work') ? 2.5 : 0;
  const labelBonus = /(debug|plan|code|build|write|review|sprint|roadmap)/i.test(activity.title) ? 1.8 : 0;
  const positiveStateBonus = activity.cognitiveStates.CONFIDENCE.length * 0.5;
  return activity.frequency + workTagBonus + labelBonus + positiveStateBonus;
};

const buildQuestions = (
  viewModel: InsightExplorerViewModel,
  graph: RelationshipMapViewModel,
  connectionMap: Map<string, WeightedConnection[]>,
) => {
  const stateNodes = graph.nodes.filter((node) => node.kind === 'state');
  const entityNodes = graph.nodes.filter((node) => node.kind === 'entity');

  const alignedNode =
    matchNodeByKeyword(stateNodes, /aligned/i, (node) => node.subtype === 'CONFIDENCE') ??
    matchNodeByKeyword(stateNodes, POSITIVE_STATE_KEYWORDS, (node) => node.subtype === 'CONFIDENCE');

  const energyDrainNode =
    matchNodeByKeyword(stateNodes, NEGATIVE_STATE_KEYWORDS, (node) => node.subtype === 'UNCERTAINTY') ??
    graph.nodes
      .filter((node) => isNegativeNode(node))
      .sort((left, right) => right.importance - left.importance || left.label.localeCompare(right.label))[0] ??
    null;

  const productiveNode =
    matchNodeByKeyword(stateNodes, PRODUCTIVE_STATE_KEYWORDS, (node) => node.subtype === 'CONFIDENCE') ??
    (() => {
      const bestActivity = [...viewModel.activityGroups].sort(
        (left, right) => activityWorkScore(right) - activityWorkScore(left) || left.title.localeCompare(right.title),
      )[0];
      return bestActivity ? graph.nodes.find((node) => node.id === `activity:${bestActivity.id}`) ?? null : null;
    })();

  const peopleNode =
    entityNodes
      .filter((node) => node.subtype === 'PERSON')
      .map((node) => ({
        node,
        score: (connectionMap.get(node.id) ?? []).reduce(
          (sum, connection) => sum + (connection.node.kind === 'state' ? connection.score : connection.score * 0.45),
          0,
        ),
      }))
      .sort((left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label))[0]?.node ?? null;

  return [
    {
      id: 'aligned',
      label: 'What makes me feel aligned?',
      helper: 'Focus the graph on the strongest repeating signals behind your most steady state.',
      targetNodeId: alignedNode?.id ?? null,
    },
    {
      id: 'energy-drain',
      label: 'What drains my energy?',
      helper: 'Surface the negative loops, environments, and conditions that keep showing up together.',
      targetNodeId: energyDrainNode?.id ?? null,
    },
    {
      id: 'productive',
      label: 'When am I most productive?',
      helper: 'Shift the view toward the work patterns that most often lead to clarity and deep output.',
      targetNodeId: productiveNode?.id ?? null,
    },
    {
      id: 'people',
      label: 'Which people affect my state?',
      helper: 'Trace the people who most often shift your emotional or cognitive state.',
      targetNodeId: peopleNode?.id ?? null,
    },
  ] satisfies RelationshipQuestionViewModel[];
};

const summarizeToneDrivers = (
  focus: RelationshipMapNodeViewModel,
  candidates: Array<{ node: RelationshipMapNodeViewModel; score: number; explanation: string }>,
) => {
  const maxScore = candidates[0]?.score ?? 1;
  return candidates
    .slice(0, 3)
    .map((candidate) => ({
      nodeId: candidate.node.id,
      label: candidate.node.label,
      kind: candidate.node.kind,
      subtype: candidate.node.subtype,
      score: candidate.score,
      impactLabel: impactLabelForScore(candidate.score, maxScore),
      explanation: candidate.explanation || explainInfluence(focus, candidate.node),
    }));
};

export const buildRelationshipMeaningModel = (
  viewModel: InsightExplorerViewModel,
  graph: RelationshipMapViewModel,
): RelationshipMeaningViewModel => {
  const connectionMap = buildConnectionMap(graph);

  const insightsByNodeId = Object.fromEntries(
    graph.nodes.map((node) => [node.id, buildInsightForNode(node, connectionMap.get(node.id) ?? [])]),
  );

  const questions = buildQuestions(viewModel, graph, connectionMap);

  const candidateNodes = graph.nodes.filter((node) => node.kind === 'activity' || node.kind === 'entity');
  const positiveInfluencers = candidateNodes
    .map((node) => {
      const toneConnections = (connectionMap.get(node.id) ?? []).filter((connection) => isPositiveNode(connection.node));
      const score = toneConnections.reduce((sum, connection) => sum + connection.score, 0);
      return {
        node,
        score,
        explanation:
          toneConnections.length > 0
            ? `${node.label} tends to lead to ${humanList(
                toneConnections.slice(0, 3).map((connection) => lowerFirst(connection.node.label)),
              )}.`
            : '',
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label));

  const negativeInfluencers = candidateNodes
    .map((node) => {
      const toneConnections = (connectionMap.get(node.id) ?? []).filter((connection) => isNegativeNode(connection.node));
      const score = toneConnections.reduce((sum, connection) => sum + connection.score, 0);
      return {
        node,
        score,
        explanation:
          toneConnections.length > 0
            ? `${node.label} tends to lead to ${humanList(
                toneConnections.slice(0, 3).map((connection) => lowerFirst(connection.node.label)),
              )}.`
            : '',
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label));

  const topPositiveInfluencers = summarizeToneDrivers(
    positiveInfluencers[0]?.node ?? graph.nodes[0],
    positiveInfluencers.slice(0, 3),
  );
  const topNegativePatterns = summarizeToneDrivers(
    negativeInfluencers[0]?.node ?? graph.nodes[0],
    negativeInfluencers.slice(0, 3),
  );

  return {
    questions,
    overview: {
      title: 'Ask what affects you',
      summary:
        'Start with a question or click a node. The graph will stay in focus mode and explain why a pattern matters instead of only showing what connects.',
      topPositiveInfluencers,
      topNegativePatterns,
    },
    insightsByNodeId,
  };
};
