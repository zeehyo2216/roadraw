export default function RunLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Run pages get full-screen layout without header
    // Using fixed positioning with safe-area padding for iOS
    return (
        <div
            className="fixed inset-0 bg-black overflow-hidden"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {children}
        </div>
    );
}
