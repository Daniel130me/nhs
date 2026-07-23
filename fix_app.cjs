const fs = require('fs');

let file = fs.readFileSync('src/App.tsx', 'utf8');
file = file.replace('import AcceptInvitation from "./components/AcceptInvitation";\n', '');

const acceptInvitationStr = `        {invitationToken ? (
          <AcceptInvitation 
            token={invitationToken} 
            onSuccess={() => {
              setInvitationToken(null);
              window.history.replaceState({}, document.title, '/');
              setMainTab('Portal'); // Send them to login
            }} 
          />
        ) : isDbLoading || isAuthChecking ? (`

file = file.replace(acceptInvitationStr, '        {isDbLoading || isAuthChecking ? (');

const tokenLogic = `
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Check for accept-invitation route
    if (window.location.pathname === '/accept-invitation' || params.has('token')) {
      setInvitationToken(params.get('token'));
    }

    const code = params.get('verify');
    if (code) {
      setUrlVerificationCode(code);
      const verifyCode = async () => {
        setPublicVerifyLoading(true);
        setPublicVerifyError(null);
        setPublicVerifyResult(null);
        try {
`;

const tokenLogicReplacement = `
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get('verify');
    if (code) {
      setUrlVerificationCode(code);
      const verifyCode = async () => {
        setPublicVerifyLoading(true);
        setPublicVerifyError(null);
        setPublicVerifyResult(null);
        try {
`;

file = file.replace(tokenLogic, tokenLogicReplacement);

fs.writeFileSync('src/App.tsx', file);
