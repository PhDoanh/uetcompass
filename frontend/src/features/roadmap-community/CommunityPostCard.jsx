export default function CommunityPostCard({ post, onOpenDetail }) {
	if (!post) return null;

	return (
		<article style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff' }}>
			<header style={{ marginBottom: 8 }}>
				<div style={{ fontWeight: 700 }}>
					{post.owner?.displayName || 'Student'} - {post.owner?.major || 'Unknown major'}
				</div>
				<div style={{ color: '#666', fontSize: 14 }}>
					{post.careerGoalRole || 'N/A'} | {post.personalisationLevel || 'N/A'}
				</div>
			</header>

			<div style={{ marginBottom: 8 }}>
				Nodes: {post.nodeCount || 0} | Likes: {post.likeCount || 0}
			</div>

			<ul style={{ paddingLeft: 18 }}>
				{(post.previewNodes || []).map((node) => (
					<li key={`${node.courseCode}-${node.reason}`}>
						{node.courseCode} - {node.courseName}
					</li>
				))}
			</ul>

			<button type="button" onClick={() => onOpenDetail?.(post.communityPostId)}>
				Open detail
			</button>
		</article>
	);
}
