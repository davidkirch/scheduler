import { Tooltip } from "@astryxdesign/core/Tooltip";
import { CircleQuestionMark } from "lucide-react";

export function LabelWithTip({
	label,
	tipContent,
	tipHeading,
}: {
	label: string;
	tipContent: string;
	tipHeading?: string;
}) {
	return (
		<div className="flex flex-row gap-1 items-center">
			<p>{label}</p>
			<Tooltip
				content={
					<div className="flex flex-col">
						{tipHeading && <p className="font-bold text-lg">{tipHeading}</p>}
						<p>{tipContent}</p>
					</div>
				}
			>
				<CircleQuestionMark className="h-4" tabIndex={0} />
			</Tooltip>
		</div>
	);
}
