# V2 original art and animation references

All SVGs and rig code in this project are authored in-house. No stock images are embedded.
Proportions are illustrative anatomy targets, not measured veterinary dimensions.

The eight-key timing model is an original adaptation of extension/contact/collection/suspension observed in Eadweard Muybridge's public-domain *Animal Locomotion* (1887). It is not a digitized motion capture dataset. Sources:

- Library of Congress collection: https://www.loc.gov/item/31004968/
- University of Pennsylvania collection: https://archives.upenn.edu/digitized-resources/docs-pubs/muybridge/
- National Gallery of Art, plate 710, racing hound galloping: https://www.nga.gov/artworks/220618-plate-number-710-dog-galloping-white-racing-hound-maggie

Species-specific phase offsets distinguish rotary gallop, trot, bound and transverse lope. The cheetah has two suspension peaks and greater spine flexion. The squirrel uses a maroon dorsal coat and cream underside inspired by the Malabar giant squirrel. A specialist/manual reference review remains useful for improving biological accuracy.

Run `npm run model-sheet` to inspect side views, true alpha silhouettes and eight stride frames. The script rejects pairwise intersection-over-union of 75% or greater.
