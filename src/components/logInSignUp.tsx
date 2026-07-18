import { useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const anonymousSchema = z.object({
	name: z.string().min(1, "Name is required."),
});

const signInSchema = z.object({
	email: z.email("That doesn't look like an email."),
	password: z.string().min(1, "Password is required."),
});

const signUpSchema = signInSchema.extend({
	name: z.string().min(1, "Name is required."),
	password: z.string().min(8, "Password must be at least 8 characters."),
});

const parseForm = <T,>(schema: z.ZodType<T>, form: HTMLFormElement): T => {
	const result = schema.safeParse(Object.fromEntries(new FormData(form)));
	if (!result.success) throw new Error(result.error.issues[0].message);
	return result.data;
};

const LoginSignUp = ({
	offerAnonymous = false,
	offerSignIn = false,
	offerSignUp = false,
	asCard = false,
	showTitle = false,
	successAction,
}: {
	offerAnonymous?: boolean;
	offerSignIn?: boolean;
	offerSignUp?: boolean;
	asCard?: boolean;
	showTitle?: boolean;
	successAction?: () => void;
}) => {
	const [error, setError] = useState<string | null>(null);
	const content = (
		<div className="flex flex-col gap-4 w-full">
			{showTitle === true && <h3>log in or sign up</h3>}
			<Tabs>
				<TabsList className="w-full">
					{offerAnonymous && (
						<TabsTrigger value="anonymous">anonymous</TabsTrigger>
					)}
					{offerSignIn && <TabsTrigger value="log in">log in</TabsTrigger>}
					{offerSignUp && <TabsTrigger value="sign up">sign up</TabsTrigger>}
				</TabsList>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				{offerAnonymous && (
					<TabsContent value="anonymous">
						<form
							noValidate
							onSubmit={async (e) => {
								e.preventDefault();
								setError(null);
								try {
									const { name } = parseForm(anonymousSchema, e.currentTarget);
									await authClient.signIn.anonymous();
									await authClient.updateUser({ name });
									successAction?.();
								} catch (err) {
									setError(
										err instanceof Error
											? err.message
											: "Something went wrong.",
									);
								}
							}}
						>
							<div className="flex flex-col gap-4">
								<div>
									<p>name</p>
									<Input name="name" type="text" required />
								</div>
								<Button type="submit">log in anonymous</Button>
							</div>
						</form>
					</TabsContent>
				)}
				{offerSignIn && (
					<TabsContent value="log in">
						<form
							noValidate
							onSubmit={async (e) => {
								e.preventDefault();
								setError(null);
								try {
									const { email, password } = parseForm(
										signInSchema,
										e.currentTarget,
									);
									await authClient.signIn.email({
										email: email,
										password: password,
									});
									successAction?.();
								} catch (err) {
									setError(
										err instanceof Error
											? err.message
											: "Something went wrong.",
									);
								}
							}}
						>
							<div className="flex flex-col gap-4">
								<div>
									<p>email</p>
									<Input name="email" type="email" required />
								</div>
								<div>
									<p>password</p>
									<Input name="password" type="password" required />
								</div>
								<Button type="submit">log in</Button>
								<Separator />
								<Button
									type="button"
									onClick={async () => {
										await authClient.signIn.social({ provider: "github" });
										successAction?.();
									}}
									className="w-full"
								>
									sign in with github
								</Button>
							</div>
						</form>
					</TabsContent>
				)}
				{offerSignUp && (
					<TabsContent value="sign up">
						<form
							noValidate
							onSubmit={async (e) => {
								e.preventDefault();
								setError(null);
								try {
									const { name, email, password } = parseForm(
										signUpSchema,
										e.currentTarget,
									);
									await authClient.signUp.email({
										email: email,
										password: password,
										name: name,
									});
									successAction?.();
								} catch (err) {
									setError(
										err instanceof Error
											? err.message
											: "Something went wrong.",
									);
								}
							}}
						>
							<div className="flex flex-col gap-4">
								<div>
									<p>name</p>
									<Input name="name" type="text" required />
								</div>
								<div>
									<p>email</p>
									<Input name="email" type="email" required />
								</div>
								<div>
									<p>password</p>
									<Input name="password" type="password" required />
								</div>
								<Button type="submit">sign up</Button>
								<Separator />
								<Button
									type="button"
									onClick={async () => {
										await authClient.signIn.social({ provider: "github" });
										successAction?.();
									}}
									className="w-full"
								>
									sign up with github
								</Button>
							</div>
						</form>
					</TabsContent>
				)}
			</Tabs>
		</div>
	);

	return asCard ? (
		<Card className="w-full max-w-sm p-4 h-fit">{content}</Card>
	) : (
		content
	);
};

export default LoginSignUp;
