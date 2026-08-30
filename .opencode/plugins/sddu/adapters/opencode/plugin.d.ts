export declare const SDDUPlugin: ({ project, client, $, directory, worktree }: {
    project: any;
    client: any;
    $: any;
    directory: any;
    worktree: any;
}) => Promise<{
    tool: {
        sddu_update_state: any;
        sddu_tag_feature: any;
        sddu_get_all_states: any;
    };
    "session.created": (input: any) => Promise<void>;
    "file.edited": (input: any) => Promise<void>;
    "session.idle": (input: any) => Promise<void>;
    "session.end": (input: any) => Promise<void>;
}>;
export default SDDUPlugin;
