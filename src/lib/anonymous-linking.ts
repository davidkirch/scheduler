type LinkableVote = {
	id: number;
	projectId: number;
	voterId: string;
};

export function planAnonymousVoteLink(
	votes: LinkableVote[],
	fromAnonymousUserId: string,
	toUserId: string,
) {
	const claimedProjectIds = new Set(
		votes
			.filter((vote) => vote.voterId === toUserId)
			.map((vote) => vote.projectId),
	);
	const deleteVoteIds: number[] = [];
	const updateVoteIds: number[] = [];

	for (const vote of votes) {
		if (vote.voterId !== fromAnonymousUserId) continue;
		if (claimedProjectIds.has(vote.projectId)) deleteVoteIds.push(vote.id);
		else updateVoteIds.push(vote.id);
	}

	return { deleteVoteIds, updateVoteIds };
}
