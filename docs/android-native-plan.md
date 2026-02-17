# Desperse Android - Native Kotlin Architecture

## Overview

Native Android app for Desperse, built with Kotlin and Jetpack Compose. Completely separate from the web codebase - communicates via HTTP API to the existing backend.

**Key Principle:** The mobile app is a thin client. All business logic, database operations, and blockchain transactions stay on the server. Mobile handles UI, auth tokens, and wallet signing only.

```
┌─────────────────┐         ┌─────────────────┐
│  Android App    │  HTTPS  │  Desperse Web   │
│  (Kotlin)       │ ──────► │  (TanStack)     │
│                 │         │                 │
│  - UI/UX        │         │  - Server Fns   │
│  - Auth tokens  │         │  - Database     │
│  - Privy wallet │         │  - Blockchain   │
│  - MWA (opt)    │         │  - Tx broadcast │
└─────────────────┘         └─────────────────┘
```

---

## SDK Documentation Sources

This plan references official documentation (versions pinned as of Jan 2026; re-check before implementation):

| SDK | Documentation | Version |
|-----|---------------|---------|
| **MWA** | [Solana Mobile Docs](https://docs.solanamobile.com/android-native/using_mobile_wallet_adapter) | 2.0.3 |
| **Solana Kotlin** | [Kotlin Setup Guide](https://docs.solanamobile.com/android-native/setup) | web3-solana 0.2.5 |
| **Privy Android** | [Privy Android Docs](https://docs.privy.io/guide/android) | latest ([Maven Central](https://mvnrepository.com/artifact/io.privy/privy-core)) |
| **Scaffold Template** | [solana-kotlin-compose-scaffold](https://github.com/solana-mobile/solana-kotlin-compose-scaffold) | - |

### Critical SDK Constraints

**Privy Android SDK:**
- Requires **Android API 28+** (Android 9.0 Pie)
- Requires **Kotlin 2.1.0+**
- OAuth support: Google, Discord, Twitter
- Embedded Solana wallet created on signup (or already exists from web)
- `signMessage()` can sign Base64-encoded transactions → server broadcasts to RPC

**Wallet Strategy for v1 (EXPLICIT RULE):**
- **All v1 on-chain actions use Privy embedded Solana wallet** - no exceptions
- **MWA is v1 "link only"** - prove ownership + store address, NOT used for signing/broadcasting
- Flow: server prepares `messageBase64` → app signs via Privy `signMessage()` → app returns `signatureBase64` → server broadcasts
- Privy `signMessage(messageBase64)` returns `Result<String>` (base64 signature)

**Future (v2+, both platforms):**
- MWA `signAndSendTransactions()` enabled for linked wallets
- User chooses which wallet to use for mint/buy/collect
- Linked external wallets can sign and broadcast directly

**MWA SDK Notes (for optional MWA support):**
- `signTransactions()` is **deprecated** in MWA 2.0 - use `signAndSendTransactions()` instead
- `iconUri` must be a **relative path** (e.g., `"favicon.ico"`), not absolute URL
- Auth tokens persist automatically in `MobileWalletAdapter` instance
- All MWA operations require an `ActivityResultSender` from the calling Activity/Fragment

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Language** | Kotlin 2.1.0+ | Required by Privy SDK |
| **Min SDK** | API 28 (Android 9) | Required by Privy SDK |
| **UI** | Jetpack Compose | Declarative UI (similar mental model to React) |
| **Navigation** | Compose Navigation | Standard Compose navigation (type-safe args opt-in) |
| **Networking** | Retrofit + OkHttp | Industry standard, interceptors for auth |
| **Serialization** | Kotlinx Serialization | Fast, Kotlin-native |
| **State** | ViewModel + StateFlow | Lifecycle-aware, reactive |
| **DI** | Hilt | Google's recommended DI |
| **Auth** | Privy Android SDK | Same auth provider as web |
| **Wallet** | MWA Client Lib 2.0.3 | First-class Solana Mobile support |
| **Solana** | web3-solana 0.2.5 | Transaction building, PublicKey class |
| **Images** | Coil | Kotlin-first, Compose-native |
| **Video** | ExoPlayer (Media3) | Google's media player |
| **Storage** | DataStore | Modern SharedPrefs replacement |
| **Security** | EncryptedSharedPreferences | Secure token storage |

---

## Project Structure

```
desperse-android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/app/desperse/
│   │   │   │   ├── DesperseApp.kt              # Application class
│   │   │   │   ├── MainActivity.kt             # Single activity
│   │   │   │   │
│   │   │   │   ├── api/                        # Network layer
│   │   │   │   │   ├── DesperseApi.kt          # Retrofit interface
│   │   │   │   │   ├── ApiClient.kt            # OkHttp setup
│   │   │   │   │   ├── AuthInterceptor.kt      # Token injection
│   │   │   │   │   └── models/                 # API DTOs
│   │   │   │   │       ├── PostDto.kt
│   │   │   │   │       ├── UserDto.kt
│   │   │   │   │       ├── EditionDto.kt
│   │   │   │   │       └── ...
│   │   │   │   │
│   │   │   │   ├── auth/                       # Authentication
│   │   │   │   │   ├── PrivyAuthManager.kt     # Privy SDK wrapper
│   │   │   │   │   ├── AuthState.kt            # Auth state holder
│   │   │   │   │   └── TokenStorage.kt         # Encrypted storage
│   │   │   │   │
│   │   │   │   ├── wallet/                     # Wallet/MWA
│   │   │   │   │   ├── MwaWalletManager.kt     # MWA operations
│   │   │   │   │   ├── WalletState.kt          # Connection state
│   │   │   │   │   ├── WalletBindingManager.kt # Binding flow
│   │   │   │   │   └── TransactionSigner.kt    # Sign helpers
│   │   │   │   │
│   │   │   │   ├── data/                       # Repository layer
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   ├── PostRepository.kt
│   │   │   │   │   │   ├── UserRepository.kt
│   │   │   │   │   │   ├── MessageRepository.kt
│   │   │   │   │   │   ├── EditionRepository.kt
│   │   │   │   │   │   └── NotificationRepository.kt
│   │   │   │   │   └── local/
│   │   │   │   │       ├── PreferencesManager.kt
│   │   │   │   │       └── DraftStorage.kt     # Offline drafts
│   │   │   │   │
│   │   │   │   ├── ui/                         # Compose UI
│   │   │   │   │   ├── theme/
│   │   │   │   │   │   ├── Theme.kt            # Desperse theme
│   │   │   │   │   │   ├── Color.kt
│   │   │   │   │   │   ├── Type.kt
│   │   │   │   │   │   └── Shape.kt
│   │   │   │   │   │
│   │   │   │   │   ├── components/             # Reusable components
│   │   │   │   │   │   ├── PostCard.kt
│   │   │   │   │   │   ├── UserAvatar.kt
│   │   │   │   │   │   ├── MediaPlayer.kt
│   │   │   │   │   │   ├── EditionBuyButton.kt
│   │   │   │   │   │   ├── WalletConnectButton.kt
│   │   │   │   │   │   └── ...
│   │   │   │   │   │
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   ├── NavGraph.kt         # Navigation setup
│   │   │   │   │   │   ├── Routes.kt           # Route definitions
│   │   │   │   │   │   └── BottomNavBar.kt
│   │   │   │   │   │
│   │   │   │   │   └── screens/                # Feature screens
│   │   │   │   │       ├── auth/
│   │   │   │   │       │   ├── LoginScreen.kt
│   │   │   │   │       │   └── LoginViewModel.kt
│   │   │   │   │       ├── feed/
│   │   │   │   │       │   ├── FeedScreen.kt
│   │   │   │   │       │   └── FeedViewModel.kt
│   │   │   │   │       ├── explore/
│   │   │   │   │       ├── post/
│   │   │   │   │       ├── profile/
│   │   │   │   │       ├── messages/
│   │   │   │   │       ├── notifications/
│   │   │   │   │       ├── create/
│   │   │   │   │       ├── wallet/
│   │   │   │   │       └── settings/
│   │   │   │   │
│   │   │   │   ├── upload/                     # Media upload
│   │   │   │   │   ├── UploadManager.kt        # Chunked uploads
│   │   │   │   │   ├── UploadWorker.kt         # WorkManager job
│   │   │   │   │   └── ProgressTracker.kt
│   │   │   │   │
│   │   │   │   ├── realtime/                   # Ably integration
│   │   │   │   │   ├── AblyManager.kt
│   │   │   │   │   └── MessageListener.kt
│   │   │   │   │
│   │   │   │   └── di/                         # Hilt modules
│   │   │   │       ├── NetworkModule.kt
│   │   │   │       ├── AuthModule.kt
│   │   │   │       └── WalletModule.kt
│   │   │   │
│   │   │   ├── res/
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   └── themes.xml
│   │   │   │   └── drawable/
│   │   │   │
│   │   │   └── AndroidManifest.xml
│   │   │
│   │   └── test/                               # Unit tests
│   │
│   └── build.gradle.kts
│
├── gradle/
│   └── libs.versions.toml                      # Version catalog
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

---

## Architecture Pattern: MVVM + Repository

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Screen    │    │  ViewModel  │    │   State     │     │
│  │  (Compose)  │◄───│  (Hilt)     │◄───│  (Flow)     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Repository                         │   │
│  │  - Coordinates API calls                            │   │
│  │  - Handles caching strategy                         │   │
│  │  - Maps DTOs to domain models                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Retrofit    │    │  DataStore   │    │    MWA       │  │
│  │  (Remote)    │    │  (Local)     │    │  (Wallet)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## API Integration

### Retrofit Interface

```kotlin
// api/DesperseApi.kt
interface DesperseApi {

    // Auth - no body needed, auth token in header is sufficient
    @POST("api/auth/init")
    suspend fun initAuth(): AuthResponse

    @GET("api/users/me")
    suspend fun getCurrentUser(): UserResponse

    // Posts
    @GET("api/posts")
    suspend fun getPosts(
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("feed") feed: String = "forYou"
    ): PostsResponse

    @GET("api/posts/{id}")
    suspend fun getPost(@Path("id") postId: String): PostResponse

    @POST("api/posts")
    suspend fun createPost(@Body request: CreatePostRequest): PostResponse

    @DELETE("api/posts/{id}")
    suspend fun deletePost(@Path("id") postId: String): DeleteResponse

    // Social
    @POST("api/users/{id}/follow")
    suspend fun followUser(@Path("id") userId: String): FollowResponse

    @DELETE("api/users/{id}/follow")
    suspend fun unfollowUser(@Path("id") userId: String): FollowResponse

    @POST("api/posts/{id}/like")
    suspend fun likePost(@Path("id") postId: String): LikeResponse

    @DELETE("api/posts/{id}/like")
    suspend fun unlikePost(@Path("id") postId: String): LikeResponse

    // Comments
    @GET("api/posts/{id}/comments")
    suspend fun getComments(
        @Path("id") postId: String,
        @Query("cursor") cursor: String? = null
    ): CommentsResponse

    @POST("api/posts/{id}/comments")
    suspend fun createComment(
        @Path("id") postId: String,
        @Body request: CreateCommentRequest
    ): CommentResponse

    // Wallet Linking (MWA - v1 link only, no transactions)
    @POST("api/wallet/challenge")
    suspend fun getWalletBindingChallenge(
        @Body request: WalletChallengeRequest
    ): WalletChallengeResponse

    @POST("api/wallet/link")
    suspend fun linkWallet(@Body request: LinkWalletRequest): LinkWalletResponse

    // Editions (v1: Privy embedded wallet only)
    // Step 1: Get messageBase64 to sign
    @POST("api/editions/buy")
    suspend fun buyEdition(@Body request: BuyEditionRequest): BuyEditionResponse
    // Response includes: messageBase64, purchaseId, priceDisplay, expiresAt

    // Step 2: Submit signatureBase64 after signing
    @POST("api/editions/signature")
    suspend fun submitSignature(@Body request: SubmitSignatureRequest): SignatureResponse
    // Request: { purchaseId, signatureBase64 }
    // Server validates signature, broadcasts, confirms

    @GET("api/editions/purchase/{id}/status")
    suspend fun checkPurchaseStatus(@Path("id") purchaseId: String): PurchaseStatusResponse

    // Collect (cNFTs - v1: Privy embedded wallet only)
    // Same pattern as editions: messageBase64 → signatureBase64 → server broadcasts
    @POST("api/posts/{id}/collect")
    suspend fun collectPost(@Path("id") postId: String): CollectResponse

    // Messages
    @GET("api/messages/threads")
    suspend fun getThreads(): ThreadsResponse

    @GET("api/messages/threads/{id}")
    suspend fun getMessages(
        @Path("id") threadId: String,
        @Query("cursor") cursor: String? = null
    ): MessagesResponse

    @POST("api/messages/threads/{id}")
    suspend fun sendMessage(
        @Path("id") threadId: String,
        @Body request: SendMessageRequest
    ): MessageResponse

    @POST("api/messages/threads/{id}/read")
    suspend fun markThreadRead(@Path("id") threadId: String): ReadResponse

    // Notifications
    @GET("api/notifications")
    suspend fun getNotifications(
        @Query("cursor") cursor: String? = null
    ): NotificationsResponse

    @POST("api/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") notificationId: String): ReadResponse

    // Explore
    @GET("api/explore/trending")
    suspend fun getTrendingPosts(): PostsResponse

    @GET("api/explore/search")
    suspend fun search(@Query("q") query: String): SearchResponse

    @GET("api/explore/creators")
    suspend fun getSuggestedCreators(): CreatorsResponse

    // Profile
    @GET("api/users/{slug}")
    suspend fun getUserProfile(@Path("slug") slug: String): UserResponse

    @PATCH("api/users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): UserResponse

    // Upload
    @POST("api/upload/presign")
    suspend fun getPresignedUrl(@Body request: PresignRequest): PresignResponse

    // Reports
    @POST("api/reports")
    suspend fun reportContent(@Body request: ReportRequest): ReportResponse

    // Ably token
    @GET("api/realtime/token")
    suspend fun getAblyToken(): AblyTokenResponse
}
```

### Auth Interceptor + Authenticator

Use separate Interceptor (attach token) and Authenticator (handle 401 refresh):

```kotlin
// api/AuthInterceptor.kt
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenStorage: TokenStorage
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Get token synchronously - tokenStorage should use synchronous read
        // or cache the token in memory after async load at app startup
        val token = tokenStorage.getCachedAccessToken()

        val newRequest = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(newRequest)
    }
}

// api/TokenAuthenticator.kt
@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val privyAuthManager: Lazy<PrivyAuthManager>  // Lazy to avoid circular DI
) : Authenticator {

    private val refreshLock = Mutex()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Guard against infinite loops (covers proxies/redirects stripping headers)
        if (responseCount(response) >= 2) return null

        // Don't retry if we've already tried once
        if (response.request.header("Authorization-Retry") != null) {
            return null
        }

        // Only one refresh at a time
        return runBlocking {
            refreshLock.withLock {
                // Check if another thread already refreshed
                val currentToken = tokenStorage.getCachedAccessToken()
                val requestToken = response.request.header("Authorization")
                    ?.removePrefix("Bearer ")

                if (currentToken != null && currentToken != requestToken) {
                    // Token was refreshed by another thread, retry with new token
                    return@runBlocking response.request.newBuilder()
                        .header("Authorization", "Bearer $currentToken")
                        .header("Authorization-Retry", "true")
                        .build()
                }

                // Ask Privy for current token (Privy handles refresh internally)
                val newToken = try {
                    privyAuthManager.get().getAccessToken()
                } catch (e: Exception) {
                    null
                }

                if (newToken != null && newToken != requestToken) {
                    tokenStorage.saveAccessToken(newToken)
                    response.request.newBuilder()
                        .header("Authorization", "Bearer $newToken")
                        .header("Authorization-Retry", "true")
                        .build()
                } else {
                    // Refresh failed or token unchanged - trigger logout via event/callback
                    // Don't clear tokens here; let the auth flow handle it
                    null
                }
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}

// api/ApiClient.kt - OkHttp setup
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(tokenAuthenticator)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG)
                    HttpLoggingInterceptor.Level.BODY
                else
                    HttpLoggingInterceptor.Level.NONE
            })
            .build()
    }
}
```

---

## MWA Integration

> **Reference:** [Using Mobile Wallet Adapter](https://docs.solanamobile.com/android-native/using_mobile_wallet_adapter)

### Wallet Manager

The MWA SDK uses a `MobileWalletAdapter` singleton with `ConnectionIdentity` for dApp metadata.

> **v1 Role:** MWA is used for wallet LINKING only (prove ownership, store address).
> All v1 transactions use Privy embedded wallet instead.
> `signAndSendTransaction()` is available but reserved for v2+.

```kotlin
// wallet/MwaWalletManager.kt
import com.solana.mobilewalletadapter.clientlib.*

@Singleton
class MwaWalletManager @Inject constructor() {

    private val _walletState = MutableStateFlow<WalletState>(WalletState.Disconnected)
    val walletState: StateFlow<WalletState> = _walletState.asStateFlow()

    // MWA SDK handles auth token persistence internally
    private val walletAdapter = MobileWalletAdapter(
        connectionIdentity = ConnectionIdentity(
            identityUri = Uri.parse("https://desperse.app"),
            iconUri = Uri.parse("favicon.ico"),  // MUST be relative path
            identityName = "Desperse"
        )
    )

    /**
     * Connect to wallet using simple connect() method.
     * Requires an ActivityResultSender from the calling Activity/Fragment.
     */
    suspend fun connect(sender: ActivityResultSender): Result<String> {
        _walletState.value = WalletState.Connecting

        return when (val result = walletAdapter.connect(sender)) {
            is TransactionResult.Success -> {
                val publicKey = result.authResult.accounts.firstOrNull()?.let {
                    Base58.encode(it.publicKey)
                } ?: return Result.failure(Exception("No accounts returned"))

                _walletState.value = WalletState.Connected(
                    publicKey = publicKey,
                    walletName = result.authResult.walletUriBase?.host ?: "Wallet"
                )
                Result.success(publicKey)
            }
            is TransactionResult.NoWalletFound -> {
                _walletState.value = WalletState.Error("No MWA wallet found")
                Result.failure(Exception("No MWA-compatible wallet installed"))
            }
            is TransactionResult.Failure -> {
                _walletState.value = WalletState.Error(result.message)
                Result.failure(Exception(result.message))
            }
        }
    }

    /**
     * Sign a message for wallet binding verification.
     * Uses signMessagesDetached() per MWA 2.0 spec.
     */
    suspend fun signMessage(sender: ActivityResultSender, message: String): Result<String> {
        val state = walletState.value as? WalletState.Connected
            ?: return Result.failure(IllegalStateException("Not connected"))

        val result = walletAdapter.transact(sender) { authResult ->
            signMessagesDetached(
                messages = arrayOf(message.toByteArray(Charsets.UTF_8)),
                addresses = arrayOf(authResult.accounts.first().publicKey)
            )
        }

        return when (result) {
            is TransactionResult.Success -> {
                val signatureBytes = result.successPayload?.messages?.firstOrNull()
                    ?.signatures?.firstOrNull()
                    ?: return Result.failure(Exception("No signature returned"))
                Result.success(Base58.encode(signatureBytes))
            }
            is TransactionResult.NoWalletFound -> Result.failure(Exception("Wallet not found"))
            is TransactionResult.Failure -> Result.failure(Exception(result.message))
        }
    }

    /**
     * Sign and send a transaction to the network.
     * Transaction is Base64-encoded VersionedTransaction from server.
     *
     * NOTE: signTransactions() is DEPRECATED in MWA 2.0.
     * Always use signAndSendTransactions() instead.
     *
     * ⚠️ V2+ ONLY: This method is NOT used in v1.
     * v1 uses Privy embedded wallet for all transactions.
     * This is here for future wallet selector feature.
     */
    suspend fun signAndSendTransaction(
        sender: ActivityResultSender,
        transactionBase64: String
    ): Result<String> {
        val txBytes = Base64.decode(transactionBase64, Base64.DEFAULT)

        val result = walletAdapter.transact(sender) { authResult ->
            signAndSendTransactions(transactions = arrayOf(txBytes))
        }

        return when (result) {
            is TransactionResult.Success -> {
                val signatureBytes = result.successPayload?.signatures?.firstOrNull()
                    ?: return Result.failure(Exception("No signature returned"))
                Result.success(Base58.encode(signatureBytes))
            }
            is TransactionResult.NoWalletFound -> Result.failure(Exception("Wallet not found"))
            is TransactionResult.Failure -> Result.failure(Exception(result.message))
        }
    }

    /**
     * Sign In with Solana (SIWS) - combines auth + message signing.
     * Useful for authentication flows requiring signature proof.
     */
    suspend fun signIn(
        sender: ActivityResultSender,
        domain: String,
        statement: String
    ): Result<SignInResult> {
        val result = walletAdapter.signIn(
            sender,
            SignInWithSolana.Payload(domain, statement)
        )

        return when (result) {
            is TransactionResult.Success -> {
                val signInResult = result.authResult.signInResult
                    ?: return Result.failure(Exception("No sign-in result"))
                Result.success(signInResult)
            }
            is TransactionResult.NoWalletFound -> Result.failure(Exception("Wallet not found"))
            is TransactionResult.Failure -> Result.failure(Exception(result.message))
        }
    }

    suspend fun disconnect(sender: ActivityResultSender) {
        walletAdapter.disconnect(sender)
        _walletState.value = WalletState.Disconnected
    }
}

sealed class WalletState {
    object Disconnected : WalletState()
    object Connecting : WalletState()
    data class Connected(
        val publicKey: String,
        val walletName: String
    ) : WalletState()
    data class Error(val message: String) : WalletState()
}
```

### Wallet Binding Flow

The binding flow is UI-driven because MWA requires an `ActivityResultSender`:

```kotlin
// wallet/WalletBindingManager.kt
@Singleton
class WalletBindingManager @Inject constructor(
    private val api: DesperseApi,
    private val walletManager: MwaWalletManager
) {
    /**
     * Bind wallet to user account.
     * MUST be called from UI layer that can provide ActivityResultSender.
     *
     * Flow:
     * 1. Get challenge from server
     * 2. Sign message with MWA (requires sender)
     * 3. Submit signature to server
     */
    suspend fun bindWallet(sender: ActivityResultSender): Result<Unit> {
        val state = walletManager.walletState.value
        val publicKey = (state as? WalletState.Connected)?.publicKey
            ?: return Result.failure(IllegalStateException("Wallet not connected"))

        // Step 1: Get challenge from server
        val challengeResponse = try {
            api.getWalletBindingChallenge(
                WalletChallengeRequest(walletAddress = publicKey)
            )
        } catch (e: Exception) {
            return Result.failure(e)
        }

        if (!challengeResponse.success) {
            return Result.failure(Exception(challengeResponse.error))
        }

        // Step 2: Sign the message with MWA (requires sender from UI)
        val signResult = walletManager.signMessage(sender, challengeResponse.message)
        val signature = signResult.getOrElse { return Result.failure(it) }

        // Step 3: Submit to server
        val linkResponse = try {
            api.linkWallet(
                LinkWalletRequest(
                    walletAddress = publicKey,
                    signature = signature,
                    message = challengeResponse.message,
                    nonce = challengeResponse.nonce,
                    walletType = "mwa"
                )
            )
        } catch (e: Exception) {
            return Result.failure(e)
        }

        return if (linkResponse.success) {
            Result.success(Unit)
        } else {
            Result.failure(Exception(linkResponse.error))
        }
    }
}

// Example usage from ViewModel/Screen:
//
// class WalletViewModel @Inject constructor(
//     private val walletManager: MwaWalletManager,
//     private val bindingManager: WalletBindingManager
// ) : ViewModel() {
//
//     fun connectAndBind(sender: ActivityResultSender) {
//         viewModelScope.launch {
//             walletManager.connect(sender).onSuccess {
//                 bindingManager.bindWallet(sender)
//             }
//         }
//     }
// }
```

---

## Privy Integration

> **Reference:** [Privy Android SDK](https://docs.privy.io/guide/android)
>
> **Requirements:** Android API 28+, Kotlin 2.1.0+
>
> **Dependency:** Via version catalog: `implementation(libs.privy.core)` — verify version on [Maven Central](https://mvnrepository.com/artifact/io.privy/privy-core) before use.

### Capabilities & Limitations

The Privy Android SDK:
- **`embeddedSolanaWallets`** - plural list, use `.firstOrNull()` to get wallet
- **`createSolanaWallet()`** - returns `Result<EmbeddedSolanaWallet>`
- **`signMessage(messageBase64)`** - returns `Result<String>` (base64 signature, NOT a signed tx blob)
- **No direct transaction broadcast** - wallet cannot submit to RPC itself (server handles this)
- **No transaction MFA** - no multi-factor for transaction signing
- **No key import/export** - wallets are managed by Privy

**For Desperse v1 (EXPLICIT RULE):**
All on-chain actions use Privy embedded wallet. MWA is link-only.

1. User signs up → Privy creates embedded Solana wallet
2. Server prepares `messageBase64` (bytes to sign)
3. App calls `wallet.provider.signMessage(messageBase64)` → returns `signatureBase64`
4. App sends `signatureBase64` to server
5. Server validates signature, assembles tx, broadcasts to RPC, confirms

**MWA in v1:** Used only to LINK external wallets (prove ownership via challenge/response). Linked wallets are stored but NOT used for transactions until v2+.

### Auth Manager

```kotlin
// auth/PrivyAuthManager.kt
@Singleton
class PrivyAuthManager @Inject constructor(
    private val application: Application,
    private val tokenStorage: TokenStorage,
    private val api: DesperseApi
) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.NotReady)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    // Privy instance - configure with app ID from dashboard
    private val privy = Privy.init(
        context = application,
        config = PrivyConfig(appId = BuildConfig.PRIVY_APP_ID)
    )

    /**
     * Initialize and check existing session.
     * Called on app startup.
     */
    suspend fun initialize() {
        // Wait for Privy to be ready
        privy.awaitReady()

        when (val state = privy.getAuthState()) {
            is PrivyAuthState.Authenticated -> {
                val token = privy.getAccessToken()
                if (token != null) {
                    tokenStorage.saveAccessToken(token)
                    fetchCurrentUser()
                } else {
                    _authState.value = AuthState.Unauthenticated
                }
            }
            is PrivyAuthState.Unauthenticated -> {
                _authState.value = AuthState.Unauthenticated
            }
            is PrivyAuthState.NotReady -> {
                // Should not happen after awaitReady()
                _authState.value = AuthState.NotReady
            }
        }
    }

    /**
     * Email login - Step 1: Send OTP code
     */
    suspend fun sendEmailCode(email: String): Result<Unit> {
        return try {
            privy.email.sendCode(email)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Email login - Step 2: Verify OTP code
     */
    suspend fun verifyEmailCode(email: String, code: String): Result<User> {
        return try {
            privy.email.loginWithCode(code, email)

            val token = privy.getAccessToken()
                ?: return Result.failure(Exception("No access token"))

            tokenStorage.saveAccessToken(token)

            // Init auth on our backend (creates user if needed)
            api.initAuth()

            // Fetch full user profile
            val user = fetchCurrentUser()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * SMS login - Step 1: Send OTP code
     * Phone number must be E.164 format (e.g., +15551234567)
     */
    suspend fun sendSmsCode(phoneNumber: String): Result<Unit> {
        return try {
            privy.sms.sendCode(phoneNumber)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * SMS login - Step 2: Verify OTP code
     */
    suspend fun verifySmsCode(phoneNumber: String, code: String): Result<User> {
        return try {
            privy.sms.loginWithCode(code, phoneNumber)

            val token = privy.getAccessToken()
                ?: return Result.failure(Exception("No access token"))

            tokenStorage.saveAccessToken(token)
            api.initAuth()

            val user = fetchCurrentUser()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * OAuth login (Google, Discord, Twitter)
     */
    suspend fun loginWithOAuth(provider: OAuthProvider): Result<User> {
        return try {
            privy.oauth.login(provider)

            val token = privy.getAccessToken()
                ?: return Result.failure(Exception("No access token"))

            tokenStorage.saveAccessToken(token)
            api.initAuth()

            val user = fetchCurrentUser()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get the user's embedded Solana wallet.
     * Users signing up on web already have one; mobile users may need to create.
     *
     * NOTE: Privy exposes wallets as `embeddedSolanaWallets` (plural list).
     */
    suspend fun getOrCreateEmbeddedWallet(): Result<EmbeddedSolanaWallet> {
        val privyUser = privy.user ?: return Result.failure(Exception("Not authenticated"))

        // Check if wallet already exists (from web signup)
        val existingWallet = privyUser.embeddedSolanaWallets.firstOrNull()
        if (existingWallet != null) {
            return Result.success(existingWallet)
        }

        // Create if needed (rare - most users have one from web)
        // createSolanaWallet() returns Result<EmbeddedSolanaWallet>
        return privyUser.createSolanaWallet()
    }

    /**
     * Sign a Base64-encoded message using the embedded wallet.
     * This is the ONLY v1 signing method for on-chain operations.
     *
     * Flow:
     * 1. Server prepares messageBase64 (bytes to sign)
     * 2. App calls this method → returns signatureBase64
     * 3. App sends signatureBase64 back to server
     * 4. Server assembles transaction, broadcasts, confirms
     *
     * NOTE: signMessage returns Result<String> (base64 signature), not a signed tx blob.
     */
    suspend fun signMessage(messageBase64: String): Result<String> {
        val privyUser = privy.user ?: return Result.failure(Exception("Not authenticated"))
        val wallet = privyUser.embeddedSolanaWallets.firstOrNull()
            ?: return Result.failure(Exception("No embedded wallet"))

        // signMessage(message: String) returns Result<String> (base64 signature)
        return wallet.provider.signMessage(messageBase64)
    }

    /**
     * Get the embedded wallet address for display.
     */
    fun getEmbeddedWalletAddress(): String? {
        return privy.user?.embeddedSolanaWallets?.firstOrNull()?.address
    }

    private suspend fun fetchCurrentUser(): User {
        val response = api.getCurrentUser()
        val user = response.toUser()
        _authState.value = AuthState.Authenticated(user)
        return user
    }

    suspend fun logout() {
        privy.logout()
        tokenStorage.clearTokens()
        _authState.value = AuthState.Unauthenticated
    }

    /**
     * Get current access token for API calls.
     * Privy handles refresh automatically.
     */
    suspend fun getAccessToken(): String? {
        return privy.getAccessToken()
    }
}

sealed class AuthState {
    object NotReady : AuthState()
    object Unauthenticated : AuthState()
    data class Authenticated(val user: User) : AuthState()
}
```

---

## UI Examples

### Theme Setup

```kotlin
// ui/theme/Color.kt
object DesperseColors {
    // Match web theme
    val Highlight = Color(0xFF6366F1)      // Indigo-500
    val HighlightDark = Color(0xFF4F46E5)  // Indigo-600
    val Background = Color(0xFF09090B)      // Zinc-950
    val Surface = Color(0xFF18181B)         // Zinc-900
    val SurfaceVariant = Color(0xFF27272A)  // Zinc-800
    val Border = Color(0xFF3F3F46)          // Zinc-700
    val TextPrimary = Color(0xFFFAFAFA)     // Zinc-50
    val TextSecondary = Color(0xFFA1A1AA)   // Zinc-400
    val TextMuted = Color(0xFF71717A)       // Zinc-500
    val Error = Color(0xFFEF4444)           // Red-500
    val Success = Color(0xFF22C55E)         // Green-500
}

// ui/theme/Theme.kt
@Composable
fun DesperseTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = darkColorScheme(
        primary = DesperseColors.Highlight,
        onPrimary = Color.White,
        background = DesperseColors.Background,
        surface = DesperseColors.Surface,
        surfaceVariant = DesperseColors.SurfaceVariant,
        onBackground = DesperseColors.TextPrimary,
        onSurface = DesperseColors.TextPrimary,
        outline = DesperseColors.Border,
        error = DesperseColors.Error
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = DesperseTypography,
        content = content
    )
}
```

### Post Card Component

```kotlin
// ui/components/PostCard.kt
@Composable
fun PostCard(
    post: Post,
    onPostClick: () -> Unit,
    onUserClick: () -> Unit,
    onLikeClick: () -> Unit,
    onCommentClick: () -> Unit,
    onCollectClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onPostClick),
        colors = CardDefaults.cardColors(
            containerColor = DesperseColors.Surface
        )
    ) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                UserAvatar(
                    avatarUrl = post.user.avatarUrl,
                    size = 40.dp,
                    onClick = onUserClick
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.user.displayName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "@${post.user.slug} · ${post.createdAt.timeAgo()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = DesperseColors.TextMuted
                    )
                }

                // Edition badge
                if (post.type == PostType.EDITION) {
                    EditionBadge(
                        price = post.editionPrice,
                        currency = post.editionCurrency
                    )
                }
            }

            // Media
            post.assets.firstOrNull()?.let { asset ->
                when (asset.type) {
                    AssetType.IMAGE -> {
                        AsyncImage(
                            model = asset.url,
                            contentDescription = null,
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(asset.aspectRatio ?: 1f),
                            contentScale = ContentScale.Crop
                        )
                    }
                    AssetType.VIDEO -> {
                        VideoThumbnail(
                            thumbnailUrl = asset.thumbnailUrl,
                            duration = asset.duration,
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(asset.aspectRatio ?: 16f/9f)
                        )
                    }
                    // ... other types
                }
            }

            // Caption
            if (post.caption.isNotBlank()) {
                Text(
                    text = post.caption,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(12.dp),
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Actions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Like
                ActionButton(
                    icon = if (post.isLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    count = post.likeCount,
                    isActive = post.isLiked,
                    onClick = onLikeClick
                )

                // Comment
                ActionButton(
                    icon = Icons.Outlined.ChatBubbleOutline,
                    count = post.commentCount,
                    onClick = onCommentClick
                )

                // Collect/Buy
                when (post.type) {
                    PostType.COLLECTIBLE -> {
                        ActionButton(
                            icon = Icons.Outlined.Add,
                            label = if (post.isCollected) "Collected" else "Collect",
                            isActive = post.isCollected,
                            onClick = onCollectClick
                        )
                    }
                    PostType.EDITION -> {
                        BuyButton(
                            price = post.editionPrice!!,
                            currency = post.editionCurrency!!,
                            remaining = post.editionRemaining,
                            onClick = onCollectClick
                        )
                    }
                    else -> Spacer(modifier = Modifier.width(48.dp))
                }

                // Share
                ActionButton(
                    icon = Icons.Outlined.Share,
                    onClick = { /* Share intent */ }
                )
            }
        }
    }
}
```

### Feed Screen

```kotlin
// ui/screens/feed/FeedScreen.kt
@Composable
fun FeedScreen(
    viewModel: FeedViewModel = hiltViewModel(),
    onPostClick: (String) -> Unit,
    onUserClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("For You", "Following")

    Column(modifier = Modifier.fillMaxSize()) {
        // Tab row
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = DesperseColors.Background,
            contentColor = DesperseColors.TextPrimary
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = {
                        selectedTab = index
                        viewModel.switchFeed(if (index == 0) "forYou" else "following")
                    },
                    text = { Text(title) }
                )
            }
        }

        // Content
        when (val state = uiState) {
            is FeedUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            is FeedUiState.Success -> {
                val pullRefreshState = rememberPullToRefreshState()

                PullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = { viewModel.refresh() },
                    state = pullRefreshState
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        items(
                            items = state.posts,
                            key = { it.id }
                        ) { post ->
                            PostCard(
                                post = post,
                                onPostClick = { onPostClick(post.id) },
                                onUserClick = { onUserClick(post.user.slug) },
                                onLikeClick = { viewModel.toggleLike(post.id) },
                                onCommentClick = { onPostClick(post.id) },
                                onCollectClick = { viewModel.collect(post) },
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }

                        // Infinite scroll trigger
                        if (state.hasMore) {
                            item {
                                LaunchedEffect(Unit) {
                                    viewModel.loadMore()
                                }
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            is FeedUiState.Error -> {
                ErrorState(
                    message = state.message,
                    onRetry = { viewModel.refresh() }
                )
            }
        }
    }
}

// ui/screens/feed/FeedViewModel.kt
@HiltViewModel
class FeedViewModel @Inject constructor(
    private val postRepository: PostRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<FeedUiState>(FeedUiState.Loading)
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    private var currentFeed = "forYou"
    private var cursor: String? = null

    init {
        loadPosts()
    }

    fun switchFeed(feed: String) {
        currentFeed = feed
        cursor = null
        loadPosts()
    }

    fun refresh() {
        cursor = null
        loadPosts(isRefresh = true)
    }

    fun loadMore() {
        if (cursor == null) return
        loadPosts(isLoadMore = true)
    }

    private fun loadPosts(isRefresh: Boolean = false, isLoadMore: Boolean = false) {
        viewModelScope.launch {
            if (!isLoadMore) {
                _uiState.value = if (isRefresh) {
                    (_uiState.value as? FeedUiState.Success)?.copy(isRefreshing = true)
                        ?: FeedUiState.Loading
                } else {
                    FeedUiState.Loading
                }
            }

            postRepository.getPosts(
                feed = currentFeed,
                cursor = if (isLoadMore) cursor else null
            ).fold(
                onSuccess = { response ->
                    cursor = response.nextCursor
                    val currentPosts = if (isLoadMore) {
                        (_uiState.value as? FeedUiState.Success)?.posts ?: emptyList()
                    } else {
                        emptyList()
                    }

                    _uiState.value = FeedUiState.Success(
                        posts = currentPosts + response.posts,
                        hasMore = response.nextCursor != null,
                        isRefreshing = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = FeedUiState.Error(
                        message = error.message ?: "Failed to load posts"
                    )
                }
            )
        }
    }

    fun toggleLike(postId: String) {
        viewModelScope.launch {
            // Optimistic update
            updatePostInState(postId) { post ->
                post.copy(
                    isLiked = !post.isLiked,
                    likeCount = if (post.isLiked) post.likeCount - 1 else post.likeCount + 1
                )
            }

            // API call
            val result = if (getCurrentPost(postId)?.isLiked == true) {
                postRepository.likePost(postId)
            } else {
                postRepository.unlikePost(postId)
            }

            // Revert on failure
            result.onFailure {
                updatePostInState(postId) { post ->
                    post.copy(
                        isLiked = !post.isLiked,
                        likeCount = if (post.isLiked) post.likeCount - 1 else post.likeCount + 1
                    )
                }
            }
        }
    }

    fun collect(post: Post) {
        viewModelScope.launch {
            when (post.type) {
                PostType.COLLECTIBLE -> collectFree(post.id)
                PostType.EDITION -> buyEdition(post)
                else -> { /* Not collectable */ }
            }
        }
    }

    private suspend fun collectFree(postId: String) {
        postRepository.collectPost(postId).fold(
            onSuccess = {
                updatePostInState(postId) { it.copy(isCollected = true) }
            },
            onFailure = { /* Show error */ }
        )
    }

    private suspend fun buyEdition(post: Post) {
        // Emit event to trigger buy flow in UI
        // This requires wallet signing, so UI handles the flow
    }

    private fun updatePostInState(postId: String, update: (Post) -> Post) {
        val current = _uiState.value as? FeedUiState.Success ?: return
        _uiState.value = current.copy(
            posts = current.posts.map { if (it.id == postId) update(it) else it }
        )
    }

    private fun getCurrentPost(postId: String): Post? {
        return (_uiState.value as? FeedUiState.Success)?.posts?.find { it.id == postId }
    }
}

sealed class FeedUiState {
    object Loading : FeedUiState()
    data class Success(
        val posts: List<Post>,
        val hasMore: Boolean,
        val isRefreshing: Boolean = false
    ) : FeedUiState()
    data class Error(val message: String) : FeedUiState()
}
```

---

## Dependencies (build.gradle.kts)

> **Sources:**
> - [Solana Mobile Kotlin Setup](https://docs.solanamobile.com/android-native/setup)
> - [Privy Android Installation](https://docs.privy.io/basics/android/installation)
> - [Maven Central - io.privy:privy-core](https://mvnrepository.com/artifact/io.privy/privy-core)

```kotlin
// gradle/libs.versions.toml
[versions]
kotlin = "2.1.0"           # Required by Privy SDK
agp = "8.7.3"
compose-bom = "2024.12.01"
hilt = "2.53.1"
retrofit = "2.11.0"
okhttp = "4.12.0"
coil = "2.7.0"
media3 = "1.5.1"
# Privy: check Maven Central for latest - https://mvnrepository.com/artifact/io.privy/privy-core
privy = "0.9.2-beta.1"     # As of Jan 2026; verify before use
mwa = "2.0.3"              # From Solana Mobile docs
web3-solana = "0.2.5"      # Solana primitives
rpc-core = "0.2.7"         # RPC abstractions
multimult = "0.2.3"        # Base58 encoding
ably = "1.2.45"
datastore = "1.1.1"
navigation = "2.8.5"
work = "2.9.1"             # WorkManager for background uploads
sentry = "7.3.0"           # Crash reporting

[libraries]
# Compose
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-icons = { module = "androidx.compose.material:material-icons-extended" }
compose-tooling = { module = "androidx.compose.ui:ui-tooling" }

# Navigation (Compose Navigation - route typing via type-safe args is opt-in)
navigation-compose = { module = "androidx.navigation:navigation-compose", version.ref = "navigation" }

# Hilt
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }
hilt-navigation = { module = "androidx.hilt:hilt-navigation-compose", version = "1.2.0" }
hilt-work = { module = "androidx.hilt:hilt-work", version = "1.2.0" }

# Network
retrofit = { module = "com.squareup.retrofit2:retrofit", version.ref = "retrofit" }
retrofit-kotlinx = { module = "com.squareup.retrofit2:converter-kotlinx-serialization", version.ref = "retrofit" }
okhttp = { module = "com.squareup.okhttp3:okhttp", version.ref = "okhttp" }
okhttp-logging = { module = "com.squareup.okhttp3:logging-interceptor", version.ref = "okhttp" }
kotlinx-serialization = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version = "1.7.3" }

# Images & Media
coil-compose = { module = "io.coil-kt:coil-compose", version.ref = "coil" }
media3-exoplayer = { module = "androidx.media3:media3-exoplayer", version.ref = "media3" }
media3-ui = { module = "androidx.media3:media3-ui", version.ref = "media3" }

# Auth (Privy) - verify version on Maven Central before use
privy-core = { module = "io.privy:privy-core", version.ref = "privy" }

# Solana Mobile (MWA + Solana primitives)
mwa-clientlib = { module = "com.solanamobile:mobile-wallet-adapter-clientlib-ktx", version.ref = "mwa" }
web3-solana = { module = "com.solanamobile:web3-solana", version.ref = "web3-solana" }
rpc-core = { module = "com.solanamobile:rpc-core", version.ref = "rpc-core" }
multimult = { module = "io.github.funkatronics:multimult", version.ref = "multimult" }

# Realtime
ably-android = { module = "io.ably:ably-android", version.ref = "ably" }

# Storage
datastore = { module = "androidx.datastore:datastore-preferences", version.ref = "datastore" }
security-crypto = { module = "androidx.security:security-crypto", version = "1.1.0-alpha06" }

# Background Work
work-runtime = { module = "androidx.work:work-runtime-ktx", version.ref = "work" }

# Crash Reporting
sentry-android = { module = "io.sentry:sentry-android", version.ref = "sentry" }

# Lifecycle
lifecycle-runtime = { module = "androidx.lifecycle:lifecycle-runtime-compose", version = "2.8.7" }
lifecycle-viewmodel = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version = "2.8.7" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version = "2.1.0-1.0.29" }
sentry = { id = "io.sentry.android.gradle", version = "4.14.1" }
```

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.sentry)
}

// Load secrets from local.properties (not committed to git)
val localProperties = java.util.Properties().apply {
    val localPropsFile = rootProject.file("local.properties")
    if (localPropsFile.exists()) {
        load(localPropsFile.inputStream())
    }
}

android {
    namespace = "app.desperse"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.desperse"
        minSdk = 28  // Android 9.0 - required by Privy SDK
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // Secrets: loaded from local.properties or CI environment
        buildConfigField(
            "String", "PRIVY_APP_ID",
            "\"${localProperties["PRIVY_APP_ID"] ?: System.getenv("PRIVY_APP_ID") ?: ""}\""
        )
        buildConfigField(
            "String", "API_BASE_URL",
            "\"${localProperties["API_BASE_URL"] ?: "https://desperse.app"}\""
        )
        buildConfigField(
            "String", "SENTRY_DSN",
            "\"${localProperties["SENTRY_DSN"] ?: System.getenv("SENTRY_DSN") ?: ""}\""
        )
    }

    // Sentry plugin config (reads DSN from BuildConfig or manifest)
    sentry {
        autoUploadProguardMapping.set(true)
        includeProguardMapping.set(true)
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    // Required for Kotlin 2.1.0+
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.icons)
    debugImplementation(libs.compose.tooling)

    // Navigation
    implementation(libs.navigation.compose)

    // DI
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation)
    implementation(libs.hilt.work)
    ksp(libs.hilt.compiler)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization)

    // Images & Media
    implementation(libs.coil.compose)
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.ui)

    // Auth (Privy)
    implementation(libs.privy.core)

    // Solana Mobile (MWA + primitives)
    implementation(libs.mwa.clientlib)
    implementation(libs.web3.solana)
    implementation(libs.rpc.core)
    implementation(libs.multimult)

    // Realtime
    implementation(libs.ably.android)

    // Storage
    implementation(libs.datastore)
    implementation(libs.security.crypto)

    // Background Work
    implementation(libs.work.runtime)

    // Crash Reporting
    implementation(libs.sentry.android)

    // Lifecycle
    implementation(libs.lifecycle.runtime)
    implementation(libs.lifecycle.viewmodel)
}
```

### Secrets Management

**Never commit secrets to git.** Use this approach:

```properties
# local.properties (gitignored)
PRIVY_APP_ID=your-privy-app-id-here
API_BASE_URL=https://desperse.app
SENTRY_DSN=https://...@sentry.io/...
```

For CI/CD (GitHub Actions, etc.):
```yaml
env:
  PRIVY_APP_ID: ${{ secrets.PRIVY_APP_ID }}
  SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

### AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Android 11+ package visibility for wallet detection -->
    <queries>
        <!--
            Primary detection: use intent query (most reliable).
            Package names may change across wallet variants/distributions.
            Validate on device before relying on specific package names.
        -->
        <intent>
            <action android:name="solana-wallet-adapter:authorize_and_sign" />
        </intent>
        <!-- Optional: specific packages (verify these are current) -->
        <package android:name="app.phantom" />
        <package android:name="com.solflare.mobile" />
    </queries>

    <application
        android:name=".DesperseApp"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.Desperse">
        <!--
            networkSecurityConfig: optional, use if you need cleartext for local dev.
            See: app/src/main/res/xml/network_security_config.xml
            For release, HTTPS is enforced by default on API 28+.
        -->

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.Desperse">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!--
                Deep links with autoVerify.
                Requires Digital Asset Links at:
                https://desperse.app/.well-known/assetlinks.json
                Without it, links still work but verification fails silently.
            -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="desperse.app" />
                <data android:scheme="desperse" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Application Class

```kotlin
// DesperseApp.kt
@HiltAndroidApp
class DesperseApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize Sentry
        if (BuildConfig.SENTRY_DSN.isNotBlank()) {
            SentryAndroid.init(this) { options ->
                options.dsn = BuildConfig.SENTRY_DSN
                options.isEnableAutoSessionTracking = true
                options.environment = if (BuildConfig.DEBUG) "development" else "production"
            }
        }
    }
}
```

### ProGuard / R8 Rules

```proguard
# proguard-rules.pro

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}

-keepclasseswithmembers class **$$serializer {
    *** INSTANCE;
}

# Retrofit
-keepattributes Signature
-keepattributes Exceptions
-keep class app.desperse.api.models.** { *; }

# Privy - check their docs for specific rules
-keep class io.privy.** { *; }

# MWA
-keep class com.solana.mobilewalletadapter.** { *; }
-keep class com.solanamobile.** { *; }
```

---

## Getting Started: Scaffold Template

> **Recommended:** Start from the official [Solana Kotlin Compose Scaffold](https://github.com/solana-mobile/solana-kotlin-compose-scaffold)

```bash
# Clone the scaffold as your starting point
git clone https://github.com/solana-mobile/solana-kotlin-compose-scaffold.git desperse-android
cd desperse-android

# Open in Android Studio
# File > Open > select build.gradle.kts
```

The scaffold provides:
- Pre-configured Jetpack Compose + Material 3
- MWA integration example
- Solana Kotlin libraries (web3-solana, rpc-core)
- Proper Gradle setup for Solana dependencies

From there, add Desperse-specific dependencies (Privy, Retrofit, Hilt, etc.) and build out the app structure.

---

## Implementation Phases

> **De-risking strategy:** MWA integration is moved to Phase 2 (immediately after basic setup) because wallet + ActivityResultSender wiring is where native Solana apps hit the most friction. Better to find issues in week 2-3 than week 6-8.

### Phase 1: Project Setup (Week 1)
- [ ] Clone scaffold or create new `desperse-android` repo
- [ ] Set up Android Studio project with Compose
- [ ] Configure Hilt dependency injection
- [ ] Set up Retrofit with base URL and interceptors
- [ ] Configure build variants (debug/release)
- [ ] Set up signing config for release builds
- [ ] Set up secrets management (local.properties)
- [ ] Create base theme matching web colors
- [ ] Create basic navigation shell (5 tabs)
- [ ] Verify build on physical device

### Phase 2: Auth + Wallet Foundation (Week 2-3) ⚠️ CRITICAL GATE

This phase is the critical de-risking gate. **You must complete a real transaction end-to-end before proceeding.**

**Primary (Required):**
- [ ] Integrate Privy Android SDK
- [ ] Implement login screen (email + Google)
- [ ] Verify embedded Solana wallet exists after login (`embeddedSolanaWallets.firstOrNull()`)
- [ ] If no wallet exists, create one (`createSolanaWallet(): Result<EmbeddedSolanaWallet>`)
- [ ] Set up token storage:
  - `EncryptedSharedPreferences` for access tokens (fast sync read for interceptor)
  - `DataStore` for non-sensitive prefs (theme, feature flags, draft pointers)
- [ ] Create auth interceptor + authenticator for API calls
- [ ] Test auth flow end-to-end
- [ ] Create API DTOs matching server responses
- [ ] Implement repository pattern for data layer

**🔥 REAL TRANSACTION SMOKE TEST (Required before gate passes):**
- [ ] Server endpoint returns `messageBase64` (bytes to sign) + `purchaseId`
- [ ] App calls `wallet.provider.signMessage(messageBase64): Result<String>`
- [ ] App sends `signatureBase64` back to server
- [ ] Server validates signature against user's embedded wallet pubkey
- [ ] Server assembles transaction, broadcasts, confirms (devnet or controlled mainnet test)
- [ ] App receives confirmation

**Optional (MWA for external wallet linking only):**
- [ ] MWA connect flow - validate ActivityResultSender wiring
- [ ] MWA signMessage - for wallet binding verification only
- [ ] Wallet binding - challenge → sign → submit (stores address, NOT used for v1 transactions)
- [ ] Session persistence - verify MWA auth token survives app restart

**Gate criteria:** Privy login works, embedded wallet signing returns base64 signature, server broadcasts successfully.
**If gate fails:** Debug Privy SDK integration before proceeding. Do NOT move to Phase 3.

### Phase 3: Browse & Discovery (Week 3-5)
- [ ] Feed screen with For You / Following tabs
- [ ] Post card component with media preview
- [ ] Infinite scroll with cursor pagination
- [ ] Pull-to-refresh
- [ ] Post detail screen
- [ ] Video player with ExoPlayer
- [ ] User profile screen
- [ ] Explore screen with search
- [ ] Category filtering

### Phase 4: Social Features (Week 5-6)
- [ ] Like/unlike with optimistic updates
- [ ] Follow/unfollow
- [ ] Comments list and compose
- [ ] Notifications screen
- [ ] Report content modal

### Phase 5: Wallet Features (Week 6-8)

**Privy Embedded Wallet (v1 - all transactions):**
- [ ] Buy editions: server sends `messageBase64` → app signs → server broadcasts
- [ ] Collect free cNFTs: same flow
- [ ] Purchase status polling with retry logic
- [ ] Transaction pending/success/error UI states
- [ ] Protected download flow (signMessage for auth challenge)
- [ ] Wallet overview screen (show embedded wallet address + balance)

**MWA Wallet (v1 - link only, no transactions):**
- [ ] Settings: "Link External Wallet" flow
- [ ] Show linked MWA wallet address in wallet overview
- [ ] Display "Linked for verification only" badge

**Future (v2+):**
- [ ] Wallet selector UI before purchase
- [ ] Buy/collect via MWA `signAndSendTransactions()` for linked wallets

### Phase 6: Content Creation (Week 8-10)
- [ ] Image picker (camera + gallery)
- [ ] Video capture
- [ ] Upload with progress (WorkManager)
- [ ] Multipart upload for large files
- [ ] Create post form
- [ ] Edition pricing input
- [ ] Edit profile

### Phase 7: Messaging (Week 10-11)
- [ ] Thread list
- [ ] Conversation screen
- [ ] Ably integration for real-time
- [ ] Send/receive messages
- [ ] Read receipts
- [ ] Start conversation from profile

### Phase 8: Polish & Launch (Week 11-13)
- [ ] Settings screen
- [ ] Deep linking
- [ ] Error states and empty states
- [ ] Loading skeletons
- [ ] Sentry crash reporting integration
- [ ] ProGuard testing (verify nothing breaks under minification)
- [ ] Store assets (screenshots, descriptions)
- [ ] dApp Store submission

---

## Backend Changes Required

The existing web backend needs HTTP API routes. Add to `apps/web/src/routes/api/`:

```typescript
// Example: apps/web/src/routes/api/posts/index.ts
import { json } from '@tanstack/react-start'
import { getPosts } from '@/server/functions/posts'

export const loader = async ({ request }) => {
  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor')
  const feed = url.searchParams.get('feed') || 'forYou'

  const result = await getPosts({ data: { cursor, feed } })
  return json(result)
}
```

This is straightforward - each route just wraps the existing server function.

---

## Key Differences from RN Plan

| Aspect | RN Plan | Native Plan |
|--------|---------|-------------|
| **Shared code** | ~15% via packages | 0% (separate repo) |
| **Build system** | Metro + EAS + prebuild | Gradle (standard) |
| **MWA** | JS bridge + polyfills | Native Kotlin SDK |
| **Crypto** | Buffer polyfill required | Just works |
| **UI framework** | Tamagui | Jetpack Compose |
| **State management** | TanStack Query | ViewModel + StateFlow |
| **Bundle size** | +15-20MB (JS runtime) | Minimal overhead |
| **Dev experience** | Hot reload | Compose previews + fast builds |
| **Team skills** | JavaScript | Kotlin |

---

## Verification Checklist

| Phase | Verification |
|-------|--------------|
| **Phase 1** | App launches, navigation works, theme matches web, builds on device |
| **Phase 2 (GATE)** | Privy login works, `embeddedSolanaWallets.firstOrNull()` returns wallet, `signMessage(messageBase64)` returns signature, server broadcasts successfully. **Do NOT proceed until real tx confirmed.** |
| **Phase 3** | Can browse all content, scroll feed, view posts |
| **Phase 4** | Can like, follow, comment, receive notifications |
| **Phase 5** | Can collect and buy via Privy embedded wallet (messageBase64 → signatureBase64 flow), purchase polling works. Optional: MWA wallet linking (no transactions) |
| **Phase 6** | Can create post with media, upload completes via WorkManager |
| **Phase 7** | Can send/receive DMs in real-time via Ably |
| **Phase 8** | ProGuard build works, Sentry reporting, app accepted on dApp Store |

---

## Wallet Strategy: Privy Embedded Only (v1)

### v1 Rule (Explicit)

> **All v1 on-chain actions use Privy embedded Solana wallet.**
> **MWA is v1 "link only" — prove ownership + store address, NOT used for signing/broadcasting.**

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION                               │
│  Privy (email, SMS, Google, Twitter)                            │
│  → Creates user account                                          │
│  → Issues JWT for API auth                                       │
│  → Embedded Solana wallet (created on web signup or mobile)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ON-CHAIN OPERATIONS (v1) - ONLY PATH                │
│  Privy Embedded Wallet                                           │
│  → Already exists from web signup (or created on mobile)        │
│  → Server sends messageBase64 (bytes to sign)                   │
│  → App calls signMessage(messageBase64) → returns signatureBase64│
│  → App sends signatureBase64 back to server                     │
│  → Server assembles tx, broadcasts to RPC, confirms             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              WALLET LINKING (v1) - OPTIONAL, NO TRANSACTIONS     │
│  MWA Wallet (Phantom, Solflare, etc.)                           │
│  → Prove ownership via signMessage (challenge/response)          │
│  → Store linked wallet address in user profile                   │
│  → Display in wallet overview                                    │
│  → NOT used for signing or broadcasting in v1                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ON-CHAIN OPERATIONS (v2+) - FUTURE                  │
│  MWA signAndSendTransactions()                                   │
│  → User selects linked wallet for purchase                       │
│  → Wallet app opens, user approves                               │
│  → Wallet broadcasts transaction directly                        │
└─────────────────────────────────────────────────────────────────┘
```

### v1 API Contract (Backend)

The server must guarantee that the exact `messageBase64` it issues is what it verifies and broadcasts against.

**POST /api/editions/buy**
```json
// Request
{ "postId": "...", "currency": "SOL" }

// Response
{
  "messageBase64": "...",   // exact bytes the app must sign
  "purchaseId": "...",
  "priceDisplay": "0.5 SOL",
  "expiresAt": "..."        // blockhash expiry
}
```

**App signs:**
```kotlin
val sigResult = wallet.provider.signMessage(messageBase64)
val signatureBase64 = sigResult.getOrThrow()
```

**POST /api/editions/signature**
```json
// Request
{
  "purchaseId": "...",
  "signatureBase64": "..."
}

// Response
{
  "success": true,
  "txSignature": "...",
  "status": "confirmed"
}
```

**Server responsibilities:**
1. Validate signature against user's embedded wallet pubkey
2. Attach signature to prepared transaction
3. Broadcast to RPC
4. Confirm and return status

This same pattern works for `/api/posts/collect` and future `/api/posts/mint`.

### User Flow (v1)

1. **New User Onboarding:**
   - Login with Privy (email/social)
   - Embedded wallet already exists (from web signup) or is created
   - Ready to transact immediately - no wallet app needed
   - Optionally: link MWA wallet in Settings (for verification only)

2. **Purchasing Editions (v1 - Embedded Wallet Only):**
   - User taps "Buy"
   - App calls `POST /api/editions/buy` → server returns `messageBase64`
   - App calls Privy `signMessage(messageBase64)` → returns `signatureBase64`
   - App sends `signatureBase64` to `POST /api/editions/signature`
   - Server broadcasts to RPC and confirms
   - App polls status or receives confirmation

3. **Linking External Wallet (v1 - Optional):**
   - User goes to Settings → "Link External Wallet"
   - MWA connect flow → wallet address captured
   - Challenge/response via signMessage → proves ownership
   - Wallet address stored in user profile
   - Displayed in wallet overview with "Linked for verification" badge
   - **Not used for any transactions in v1**

### Why Privy Embedded Only for v1?

- **Zero friction** - users already have wallet from web signup
- **No app switching** - signing happens in-app via Privy UI
- **Simpler onboarding** - no "install Phantom" requirement for core flows
- **Consistent with web** - same wallet, same funds
- **Works immediately** - no additional setup needed
- **Simpler server logic** - one signing path to validate

### MWA in v2+

Future enhancement for users who prefer external wallets:
- **Self-custody** - keys in Phantom/Solflare, not Privy
- **Hardware wallet** - Ledger via Solflare
- **Existing funds** - wallet already has SOL/USDC

v2+ features:
- Wallet selector before purchase: "Use embedded wallet" or "Use Phantom"
- MWA `signAndSendTransactions()` for linked wallets
- Linked wallet can broadcast directly (wallet handles RPC)

---

## Revision Checklist (Jan 2026)

- [x] In "Wallet Strategy for v1", explicitly say: **Privy embedded only for transactions, MWA link only**
- [x] Remove/relocate any v1 mention of MWA `signAndSendTransactions` into v2+
- [x] Phase 2 gate: add a real "prepare → sign → submit → broadcast → confirm" smoke test using Privy
- [x] Fix Privy code to use:
  - `embeddedSolanaWallets.firstOrNull()`
  - `createSolanaWallet(): Result<EmbeddedSolanaWallet>`
  - `provider.signMessage(messageBase64): Result<String>`
- [x] Adjust backend endpoints so the app signs `messageBase64` and returns `signatureBase64`
- [x] Update verification checklist to match phase order
