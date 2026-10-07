import { Text } from "@astryxdesign/core";
import { Button } from "@astryxdesign/core/Button";
import { Popover } from "@astryxdesign/core/Popover";
import { Selector } from "@astryxdesign/core/Selector";
import Avatar from "boring-avatars";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
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
	}, []);

	return (
		<>
			{session !== null && (
				<Popover
					label="User menu"
					alignment="start"
					width="fit-content"
					content={
						<div className="flex w-fit flex-col gap-2 text-sm">
							<AvatarName name={session.user.name} />

							{mounted && (
								<ThemeSelect
									theme={theme}
									themes={themes}
									setTheme={setTheme}
								/>
							)}

							<Text color="secondary">{session?.user.email}</Text>

							<div className="flex flex-row justify-between items-center gap-2">
								<SignOutButton />
								<DeleteAccountButton withConfirmation />
							</div>
						</div>
					}
				>
					<Button
						label={session.user.name}
						variant="secondary"
						className="w-fit p-2 h-fit justify-start bg-white"
					>
						<AvatarName name={session.user.name} />
					</Button>
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
		<Selector
			label="theme"
			isLabelHidden
			options={themes.map((theme) => ({
				value: theme,
				label: themeLabels[theme] ?? theme,
			}))}
			value={theme}
			onChange={setTheme}
			placeholder="Theme"
			width={180}
		/>
	);
}

function AvatarName({ name }: { name: string }) {
	return (
		<div className="flex flex-row gap-2 items-center">
			<Avatar variant="beam" size={30} title={true} name={name} />
			<Text>{name}</Text>
		</div>
	);
}

export default UserBubble;
