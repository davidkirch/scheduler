import Avatar from "boring-avatars";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import DeleteAccountButton from "./deleteAccountButton";
import SignOutButton from "./signOutButton";

const themeLabels: Record<string, string | undefined> = {
	light: "light mode",
	dark: "dark mode",
	system: "system",
	peach: "peach mode",
};

const UserBubble = () => {
	const { data: session } = useSession();
	const { theme, themes, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
		console.log(themes);
	});

	return (
		<>
			{session !== null && (
				<Popover>
					<PopoverTrigger
						render={
							<Button
								variant="outline"
								className="w-fit p-1 h-fit justify-start"
							>
								<AvatarName name={session.user.name} />
							</Button>
						}
					/>
					<PopoverContent className="w-fit" align="start">
						<AvatarName name={session.user.name} />

						{mounted && (
							<ThemeSelect theme={theme} themes={themes} setTheme={setTheme} />
						)}

						<p className="text-muted-foreground">{session?.user.email}</p>

						<div className="flex flex-row justify-between items-center gap-2">
							<SignOutButton />
							<DeleteAccountButton withConfirmation />
						</div>
					</PopoverContent>
				</Popover>
			)}
		</>
	);
};

function ThemeSelect({
	theme,
	themes,
	setTheme,
}: {
	theme: string | undefined;
	themes: string[];
	setTheme: (theme: string) => void;
}) {
	return (
		<Select
			items={themeLabels}
			defaultValue={theme}
			onValueChange={(value) => {
				if (value !== null) setTheme(value);
			}}
		>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Theme" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{themes.map((theme) => (
						<SelectItem key={theme} value={theme}>
							{themeLabels[theme]}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function AvatarName({ name }: { name: string }) {
	return (
		<div className="flex flex-row gap-2 items-center">
			<Avatar variant="beam" title={true} name={name} />
			<p>{name}</p>
		</div>
	);
}

export default UserBubble;
