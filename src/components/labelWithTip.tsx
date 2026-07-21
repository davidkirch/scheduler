import { Text } from "@astryxdesign/core";
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
			<Text>{label}</Text>
			<Tooltip
				content={
					<div className="flex flex-col">
						{tipHeading && <Text size="lg">{tipHeading}</Text>}
						<Text>{tipContent}</Text>
					</div>
				}
			>
				<CircleQuestionMark className="h-4" tabIndex={0} />
			</Tooltip>
		</div>
	);
}
