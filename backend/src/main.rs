#[tokio::main]
async fn main() -> anyhow::Result<()> {
    apicostguard_backend::run().await
}
