import React, { useEffect, useState } from 'react';
import type {
  ButterflyChoicePanelViewModel,
  GoodwillPanelViewModel,
  IncidentPanelViewModel,
  LoopResultPanelViewModel,
} from '../runtimeInteractionView';
import { GoodwillInteractionPanel } from './GoodwillInteractionPanel';
import { IncidentResolutionPanel } from './IncidentResolutionPanel';
import { LoopResultResolutionPanel } from './LoopResultResolutionPanel';
import type { SidebarInteractionMoves, SidebarTargetSelections } from './sidebarInteractionHelpers';

type PublicInteractionPanelsProps = {
  isMastermind: boolean;
  isLeader: boolean;
  goodwillPanel: GoodwillPanelViewModel;
  incidentPanel: IncidentPanelViewModel;
  butterflyPanel: ButterflyChoicePanelViewModel;
  loopResultPanel: LoopResultPanelViewModel;
  interactionMoves: SidebarInteractionMoves;
};

export const PublicInteractionPanels: React.FC<PublicInteractionPanelsProps> = ({
  isMastermind,
  isLeader,
  goodwillPanel,
  incidentPanel,
  butterflyPanel,
  loopResultPanel,
  interactionMoves,
}) => {
  const [gwTargets, setGwTargets] = useState<SidebarTargetSelections>({});
  const [incTargets, setIncTargets] = useState<SidebarTargetSelections>({});
  const [bfToken, setBfToken] = useState<'goodwill' | 'paranoia' | 'intrigue' | null>(null);
  const [loopResultReasonId, setLoopResultReasonId] = useState<string | null>(null);
  const [loopResultOutcomeId, setLoopResultOutcomeId] = useState<string | null>(null);

  const hasPublicInteraction = goodwillPanel.visible || incidentPanel.visible || butterflyPanel.visible || loopResultPanel.visible;

  useEffect(() => {
    const interaction = loopResultPanel.interaction;
    if (!interaction) {
      setLoopResultReasonId(null);
      setLoopResultOutcomeId(null);
      return;
    }
    setLoopResultReasonId(interaction.failureReasons[0]?.id || null);
    setLoopResultOutcomeId(interaction.availableOutcomes[0]?.id || null);
  }, [loopResultPanel.interaction?.interactionId]);

  useEffect(() => {
    setBfToken(null);
  }, [butterflyPanel.interaction?.interactionId]);

  if (!hasPublicInteraction) {
    return null;
  }

  return (
    <div className="space-y-3">
      <GoodwillInteractionPanel
        panel={goodwillPanel}
        isMastermind={isMastermind}
        isLeader={isLeader}
        gwTargets={gwTargets}
        setGwTargets={setGwTargets}
        interactionMoves={interactionMoves}
      />
      <LoopResultResolutionPanel
        panel={loopResultPanel}
        isMastermind={isMastermind}
        loopResultReasonId={loopResultReasonId}
        setLoopResultReasonId={setLoopResultReasonId}
        loopResultOutcomeId={loopResultOutcomeId}
        setLoopResultOutcomeId={setLoopResultOutcomeId}
        interactionMoves={interactionMoves}
      />
      <IncidentResolutionPanel
        incidentPanel={incidentPanel}
        butterflyPanel={butterflyPanel}
        isMastermind={isMastermind}
        incTargets={incTargets}
        setIncTargets={setIncTargets}
        bfToken={bfToken}
        setBfToken={setBfToken}
        interactionMoves={interactionMoves}
      />
    </div>
  );
};
