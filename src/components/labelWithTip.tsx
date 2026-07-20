import { CircleQuestionMark } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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
			<Tooltip>
				<TooltipTrigger render={<CircleQuestionMark className="h-4" />} />
				<TooltipContent>
					<div className="flex flex-col">
						<p className="font-bold text-lg">{tipHeading}</p>
						<p>{tipContent}</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
